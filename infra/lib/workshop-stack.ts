import * as path from 'node:path';
import { CfnResource, Stack, type StackProps } from 'aws-cdk-lib';
import { CfnInclude } from 'aws-cdk-lib/cloudformation-include';
import type { Construct } from 'constructs';
import {
  PASSWORD_ENV,
  PASSWORD_OUTPUT,
  PASSWORD_RESOURCE_PROPERTIES,
} from './redactions.js';

const TEMPLATE_FILE = path.join(
  import.meta.dirname,
  '..',
  'templates',
  'workshop-stack.template.json',
);

export interface WorkshopStackProps extends StackProps {
  readonly testUserPassword: string;
}

export class WorkshopStack extends Stack {
  readonly template: CfnInclude;

  constructor(scope: Construct, id: string, props: WorkshopStackProps) {
    super(scope, id, props);

    this.template = new CfnInclude(this, 'Template', {
      templateFile: TEMPLATE_FILE,
      preserveLogicalIds: true,
    });

    for (const { logicalId, property } of PASSWORD_RESOURCE_PROPERTIES) {
      const resource = this.template.getResource(logicalId);
      if (!(resource instanceof CfnResource)) {
        throw new Error(`Resource ${logicalId} not found in ${TEMPLATE_FILE}`);
      }
      resource.addPropertyOverride(property, props.testUserPassword);
    }
    this.template.getOutput(PASSWORD_OUTPUT).value = props.testUserPassword;
  }
}

export function readTestUserPassword(): string {
  const value = process.env[PASSWORD_ENV];
  if (!value) {
    throw new Error(
      `${PASSWORD_ENV} is not set. Run cdk through scripts/with-live-password.sh, ` +
        'which reads it from the live stack output.',
    );
  }
  return value;
}
