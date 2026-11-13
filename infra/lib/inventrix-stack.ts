import * as path from 'node:path';
import {
  AssetHashType,
  CfnOutput,
  CustomResource,
  DockerImage,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from 'aws-cdk-lib';
import {
  HttpApi,
  HttpMethod,
  HttpStage,
  type HttpRouteIntegration,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import {
  AgentCoreRuntime,
  AgentRuntimeArtifact,
  Runtime as AgentRuntime,
} from 'aws-cdk-lib/aws-bedrockagentcore';
import {
  AllowedMethods,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  CachePolicy,
  CacheQueryStringBehavior,
  Distribution,
  Function as CloudFrontFunction,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  OriginProtocolPolicy,
  OriginRequestPolicy,
  PriceClass,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  AccountRecovery,
  FeaturePlan,
  UserPool,
  type UserPoolClient,
  UserPoolGroup,
  UserPoolOperation,
} from 'aws-cdk-lib/aws-cognito';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  Architecture,
  Code,
  Function as LambdaFunction,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  AuroraPostgresEngineVersion,
  ClusterInstance,
  Credentials,
  DatabaseCluster,
  DatabaseClusterEngine,
  DatabaseSecret,
} from 'aws-cdk-lib/aws-rds';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
} from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import type { Construct } from 'constructs';
import { buildSync } from 'esbuild';

const APP_ROOT = path.join(import.meta.dirname, '..', '..', 'inventrix-code');
const API_ROOT = path.join(APP_ROOT, 'packages', 'api');
const FRONTEND_DIST = path.join(APP_ROOT, 'packages', 'frontend', 'dist');
const SUPPORT_AGENT_ROOT = path.join(APP_ROOT, 'packages', 'support-agent');

const AUTH_HANDLERS_ROOT = path.join(import.meta.dirname, '..', 'lambda');

const DATABASE_NAME = 'inventrix';
const ADMIN_GROUP = 'admin';
const ADMIN_EMAIL = 'admin@inventrix.com';
const IMAGE_MODEL_ID = 'amazon.nova-canvas-v1:0';

// The us. cross-region inference profile routes requests to these regions.
const SUPPORT_MODEL = 'anthropic.claude-haiku-4-5-20251001-v1:0';
const SUPPORT_MODEL_PROFILE = `us.${SUPPORT_MODEL}`;
const SUPPORT_MODEL_REGIONS = ['us-east-1', 'us-east-2', 'us-west-2'];

// Rewrites client-side routes (no file extension) to the SPA entry. Only attached to the default
// behavior, so /api/* error responses reach the browser unchanged.
const SPA_REWRITE_CODE = `
function handler(event) {
  var request = event.request;
  var lastSegment = request.uri.split('/').pop();
  if (lastSegment.indexOf('.') === -1) {
    request.uri = '/index.html';
  }
  return request;
}`;

export class InventrixStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const { cluster, imagesBucket } = this.createDataLayer();
    const { userPool, userPoolClient, adminSecret } = this.createAuth();
    const apiFunction = this.createApiFunction(
      cluster,
      imagesBucket,
      userPool,
      userPoolClient,
    );
    const httpApi = this.createHttpApi(apiFunction, userPool, userPoolClient);
    const supportAgent = this.createSupportAgent(httpApi);
    apiFunction.addEnvironment(
      'SUPPORT_AGENT_RUNTIME_ARN',
      supportAgent.agentRuntimeArn,
    );
    supportAgent.grantInvokeRuntime(apiFunction);
    const distribution = this.createDistribution(httpApi, imagesBucket);

    new CfnOutput(this, 'SiteUrl', {
      value: `https://${distribution.distributionDomainName}`,
    });
    new CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    });
    new CfnOutput(this, 'ApiFunctionName', { value: apiFunction.functionName });
    new CfnOutput(this, 'ClusterArn', { value: cluster.clusterArn });
    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });
    new CfnOutput(this, 'AdminSecretArn', { value: adminSecret.secretArn });
    new CfnOutput(this, 'SupportAgentRuntimeArn', {
      value: supportAgent.agentRuntimeArn,
    });
  }

  private createDataLayer(): {
    cluster: DatabaseCluster;
    imagesBucket: Bucket;
  } {
    const vpc = new Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'database',
          subnetType: SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    const databaseSecret = new DatabaseSecret(this, 'DatabaseSecret', {
      username: 'inventrix_admin',
    });
    databaseSecret.applyRemovalPolicy(RemovalPolicy.RETAIN);

    const cluster = new DatabaseCluster(this, 'Database', {
      engine: DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_17_9,
      }),
      writer: ClusterInstance.serverlessV2('writer'),
      serverlessV2MinCapacity: 0,
      serverlessV2MaxCapacity: 2,
      serverlessV2AutoPauseDuration: Duration.minutes(30),
      enableDataApi: true,
      defaultDatabaseName: DATABASE_NAME,
      credentials: Credentials.fromSecret(databaseSecret),
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      storageEncrypted: true,
      backup: { retention: Duration.days(7) },
      removalPolicy: RemovalPolicy.SNAPSHOT,
    });

    const imagesBucket = new Bucket(this, 'ImagesBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    new BucketDeployment(this, 'SeedImages', {
      sources: [Source.asset(path.join(API_ROOT, 'public', 'images'))],
      destinationBucket: imagesBucket,
      destinationKeyPrefix: 'images/',
      prune: false,
      retainOnDelete: true,
    });

    return { cluster, imagesBucket };
  }

  private createAuth(): {
    userPool: UserPool;
    userPoolClient: UserPoolClient;
    adminSecret: Secret;
  } {
    const preSignUp = new LambdaFunction(this, 'PreSignUpFunction', {
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      handler: 'index.handler',
      code: Code.fromAsset(path.join(AUTH_HANDLERS_ROOT, 'pre-sign-up')),
      logGroup: new LogGroup(this, 'PreSignUpLogGroup', {
        retention: RetentionDays.ONE_MONTH,
      }),
    });

    // Sign-up only needs email and password: the pre sign-up trigger confirms the account, so
    // Cognito never sends a verification email.
    const userPool = new UserPool(this, 'UserPool', {
      featurePlan: FeaturePlan.LITE,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      signInCaseSensitive: false,
      autoVerify: { email: false },
      standardAttributes: { fullname: { required: false, mutable: true } },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
      },
      accountRecovery: AccountRecovery.NONE,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    userPool.addTrigger(UserPoolOperation.PRE_SIGN_UP, preSignUp);

    const userPoolClient = userPool.addClient('WebClient', {
      authFlows: { userPassword: true },
      generateSecret: false,
      preventUserExistenceErrors: true,
      idTokenValidity: Duration.days(1),
      accessTokenValidity: Duration.days(1),
      refreshTokenValidity: Duration.days(1),
    });

    const adminGroup = new UserPoolGroup(this, 'AdminGroup', {
      userPool,
      groupName: ADMIN_GROUP,
    });

    const adminSecret = new Secret(this, 'AdminCredentials', {
      description: 'Inventrix admin sign-in (username and password)',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: ADMIN_EMAIL }),
        generateStringKey: 'password',
        passwordLength: 24,
        excludePunctuation: true,
      },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const adminUserFunction = new LambdaFunction(this, 'AdminUserFunction', {
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      handler: 'index.handler',
      timeout: Duration.seconds(30),
      code: Code.fromAsset(path.join(AUTH_HANDLERS_ROOT, 'admin-user')),
      logGroup: new LogGroup(this, 'AdminUserLogGroup', {
        retention: RetentionDays.ONE_MONTH,
      }),
    });
    adminSecret.grantRead(adminUserFunction);
    adminUserFunction.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'cognito-idp:AdminAddUserToGroup',
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminSetUserPassword',
        ],
        resources: [userPool.userPoolArn],
      }),
    );

    // The handler reads the password itself: CloudFormation does not resolve Secrets Manager
    // dynamic references inside custom resource properties.
    const adminUser = new CustomResource(this, 'AdminUser', {
      serviceToken: new Provider(this, 'AdminUserProvider', {
        onEventHandler: adminUserFunction,
      }).serviceToken,
      properties: {
        UserPoolId: userPool.userPoolId,
        SecretArn: adminSecret.secretArn,
        GroupName: adminGroup.groupName,
      },
    });
    adminUser.node.addDependency(adminGroup);

    return { userPool, userPoolClient, adminSecret };
  }

  private createApiFunction(
    cluster: DatabaseCluster,
    imagesBucket: Bucket,
    userPool: UserPool,
    userPoolClient: UserPoolClient,
  ): NodejsFunction {
    if (!cluster.secret)
      throw new Error('Database cluster has no generated secret');

    const fn = new NodejsFunction(this, 'ApiFunction', {
      entry: path.join(API_ROOT, 'src', 'lambda.ts'),
      handler: 'handler',
      projectRoot: APP_ROOT,
      depsLockFilePath: path.join(APP_ROOT, 'pnpm-lock.yaml'),
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      memorySize: 1024,
      timeout: Duration.seconds(29),
      bundling: {
        format: OutputFormat.CJS,
        target: 'node22',
        sourceMap: true,
        externalModules: [
          '@aws-sdk/client-bedrock-runtime',
          '@aws-sdk/client-rds-data',
          '@aws-sdk/client-s3',
          '@aws-sdk/client-cognito-identity-provider',
          '@electric-sql/pglite',
        ],
      },
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        DB_CLUSTER_ARN: cluster.clusterArn,
        DB_SECRET_ARN: cluster.secret.secretArn,
        DB_NAME: DATABASE_NAME,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        IMAGES_BUCKET: imagesBucket.bucketName,
      },
      logGroup: new LogGroup(this, 'ApiLogGroup', {
        retention: RetentionDays.ONE_MONTH,
      }),
    });

    cluster.grantDataApiAccess(fn);
    imagesBucket.grantPut(fn, 'images/*');
    fn.addToRolePolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:${this.partition}:bedrock:${this.region}::foundation-model/${IMAGE_MODEL_ID}`,
        ],
      }),
    );
    return fn;
  }

  private createHttpApi(
    fn: NodejsFunction,
    userPool: UserPool,
    userPoolClient: UserPoolClient,
  ): HttpApi {
    const httpApi = new HttpApi(this, 'HttpApi', { createDefaultStage: false });
    new HttpStage(this, 'DefaultStage', {
      httpApi,
      stageName: '$default',
      autoDeploy: true,
      throttle: { rateLimit: 50, burstLimit: 100 },
    });

    const integration: HttpRouteIntegration = new HttpLambdaIntegration(
      'ApiIntegration',
      fn,
    );
    const publicRoutes: ReadonlyArray<[string, HttpMethod]> = [
      ['/api/auth/login', HttpMethod.POST],
      ['/api/auth/register', HttpMethod.POST],
      ['/api/products', HttpMethod.GET],
      ['/api/products/{id}', HttpMethod.GET],
      // Cart and Gomoku also serve guests (X-Guest-Id); the API's identify middleware checks tokens.
      ['/api/cart', HttpMethod.ANY],
      ['/api/cart/{proxy+}', HttpMethod.ANY],
      ['/api/gomoku', HttpMethod.ANY],
      ['/api/gomoku/{proxy+}', HttpMethod.ANY],
      // Guests can chat too; the API passes a valid token on to the agent's tools.
      ['/api/support/chat', HttpMethod.POST],
    ];
    for (const [routePath, method] of publicRoutes) {
      httpApi.addRoutes({ path: routePath, methods: [method], integration });
    }
    // Every other /api route needs a valid Cognito ID token from this app client.
    httpApi.addRoutes({
      path: '/api/{proxy+}',
      methods: [HttpMethod.ANY],
      integration,
      authorizer: new HttpUserPoolAuthorizer('UserPoolAuthorizer', userPool, {
        userPoolClients: [userPoolClient],
      }),
    });
    return httpApi;
  }

  private createSupportAgent(httpApi: HttpApi): AgentRuntime {
    // Bundled to one CommonJS file so the zip carries no node_modules.
    const artifact = AgentRuntimeArtifact.fromCodeAsset({
      path: SUPPORT_AGENT_ROOT,
      runtime: AgentCoreRuntime.NODE_22,
      entrypoint: ['index.js'],
      assetHashType: AssetHashType.OUTPUT,
      bundling: {
        image: DockerImage.fromRegistry(
          'public.ecr.aws/docker/library/node:22',
        ),
        local: {
          tryBundle(outputDir: string): boolean {
            buildSync({
              entryPoints: [path.join(SUPPORT_AGENT_ROOT, 'src', 'main.ts')],
              outfile: path.join(outputDir, 'index.js'),
              bundle: true,
              platform: 'node',
              target: 'node22',
              format: 'cjs',
              legalComments: 'none',
              logLevel: 'warning',
            });
            return true;
          },
        },
      },
    });

    // Tools call the HTTP API directly; the CloudFront domain would create a dependency cycle.
    const runtime = new AgentRuntime(this, 'SupportAgent', {
      runtimeName: 'inventrix_support',
      description: 'Inventrix storefront customer support assistant',
      agentRuntimeArtifact: artifact,
      environmentVariables: {
        INVENTRIX_API_URL: httpApi.apiEndpoint,
        SUPPORT_MODEL_ID: SUPPORT_MODEL_PROFILE,
      },
      lifecycleConfiguration: {
        idleRuntimeSessionTimeout: Duration.minutes(15),
      },
    });

    runtime.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: [
          `arn:${this.partition}:bedrock:${this.region}:${this.account}:inference-profile/${SUPPORT_MODEL_PROFILE}`,
          ...SUPPORT_MODEL_REGIONS.map(
            (region) =>
              `arn:${this.partition}:bedrock:${region}::foundation-model/${SUPPORT_MODEL}`,
          ),
        ],
      }),
    );
    return runtime;
  }

  private createDistribution(
    httpApi: HttpApi,
    imagesBucket: Bucket,
  ): Distribution {
    const siteBucket = new Bucket(this, 'SiteBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const spaRewrite = new CloudFrontFunction(this, 'SpaRewrite', {
      code: FunctionCode.fromInline(SPA_REWRITE_CODE),
      runtime: FunctionRuntime.JS_2_0,
    });

    // Authorization must be part of the cache key to be forwarded; TTL 0 keeps API responses uncached.
    const apiCachePolicy = new CachePolicy(this, 'ApiCachePolicy', {
      minTtl: Duration.seconds(0),
      defaultTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(1),
      headerBehavior: CacheHeaderBehavior.allowList('Authorization'),
      queryStringBehavior: CacheQueryStringBehavior.all(),
      cookieBehavior: CacheCookieBehavior.none(),
    });

    const apiDomain = `${httpApi.apiId}.execute-api.${this.region}.${this.urlSuffix}`;

    const distribution = new Distribution(this, 'Distribution', {
      comment: 'Inventrix storefront',
      defaultRootObject: 'index.html',
      priceClass: PriceClass.PRICE_CLASS_100,
      webAclId: this.createWebAcl().attrArn,
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [
          { function: spaRewrite, eventType: FunctionEventType.VIEWER_REQUEST },
        ],
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new HttpOrigin(apiDomain, {
            protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachePolicy: apiCachePolicy,
          originRequestPolicy:
            OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        '/images/*': {
          origin: S3BucketOrigin.withOriginAccessControl(imagesBucket),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        },
      },
    });

    new BucketDeployment(this, 'SiteDeployment', {
      sources: [Source.asset(FRONTEND_DIST)],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    return distribution;
  }

  private createWebAcl(): CfnWebACL {
    const visibility = (
      metricName: string,
    ): CfnWebACL.VisibilityConfigProperty => ({
      cloudWatchMetricsEnabled: true,
      metricName,
      sampledRequestsEnabled: true,
    });
    const managedRule = (
      name: string,
      priority: number,
    ): CfnWebACL.RuleProperty => ({
      name,
      priority,
      overrideAction: { none: {} },
      statement: { managedRuleGroupStatement: { vendorName: 'AWS', name } },
      visibilityConfig: visibility(name),
    });
    const rateLimitRule = (
      name: string,
      priority: number,
      pathPrefix: string,
      limit: number,
    ): CfnWebACL.RuleProperty => ({
      name,
      priority,
      action: { block: {} },
      statement: {
        rateBasedStatement: {
          limit,
          evaluationWindowSec: 600,
          aggregateKeyType: 'IP',
          scopeDownStatement: {
            byteMatchStatement: {
              fieldToMatch: { uriPath: {} },
              positionalConstraint: 'STARTS_WITH',
              searchString: pathPrefix,
              textTransformations: [{ priority: 0, type: 'NONE' }],
            },
          },
        },
      },
      visibilityConfig: visibility(name),
    });

    return new CfnWebACL(this, 'WebAcl', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: visibility('InventrixWebAcl'),
      rules: [
        managedRule('AWSManagedRulesCommonRuleSet', 0),
        managedRule('AWSManagedRulesKnownBadInputsRuleSet', 1),
        rateLimitRule('AuthRateLimit', 2, '/api/auth/', 20),
        rateLimitRule('ApiRateLimit', 3, '/api/', 2000),
        rateLimitRule('SupportChatRateLimit', 4, '/api/support/', 100),
      ],
    });
  }
}
