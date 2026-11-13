import { App, LegacyStackSynthesizer } from 'aws-cdk-lib';
import { InventrixStack } from '../lib/inventrix-stack.js';
import { WorkshopStack, readTestUserPassword } from '../lib/workshop-stack.js';

const REGION = 'us-east-1';

const app = new App();

// The live stack was not deployed by CDK: no bootstrap rule, no CDKMetadata, so the synthesized template matches it.
new WorkshopStack(app, 'workshop-stack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: REGION },
  synthesizer: new LegacyStackSynthesizer(),
  analyticsReporting: false,
  testUserPassword: readTestUserPassword(),
});

new InventrixStack(app, 'inventrix', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: REGION },
});
