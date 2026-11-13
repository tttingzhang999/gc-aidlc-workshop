import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import * as path from 'node:path';
import {
  PASSWORD_OUTPUT,
  PASSWORD_PLACEHOLDER,
  PASSWORD_RESOURCE_PROPERTIES,
} from '../lib/redactions.js';

type Template = {
  Resources: Record<string, { Properties?: Record<string, unknown> }>;
  Outputs: Record<string, { Value: unknown }>;
};

const STACK_NAME = 'workshop-stack';
const OUT_FILE = path.join(
  import.meta.dirname,
  '..',
  'templates',
  `${STACK_NAME}.template.json`,
);

function fetchTemplate(): Template {
  const raw = execFileSync(
    'aws',
    [
      'cloudformation',
      'get-template',
      '--stack-name',
      STACK_NAME,
      '--template-stage',
      'Original',
      '--query',
      'TemplateBody',
      '--output',
      'json',
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const body: unknown = JSON.parse(raw);
  return (typeof body === 'string' ? JSON.parse(body) : body) as Template;
}

function redactPasswords(template: Template): Template {
  const resources = { ...template.Resources };
  for (const { logicalId, property } of PASSWORD_RESOURCE_PROPERTIES) {
    const resource = resources[logicalId];
    if (!resource?.Properties || !(property in resource.Properties)) {
      throw new Error(
        `Expected ${logicalId}.Properties.${property} in the live template`,
      );
    }
    resources[logicalId] = {
      ...resource,
      Properties: { ...resource.Properties, [property]: PASSWORD_PLACEHOLDER },
    };
  }
  if (!template.Outputs[PASSWORD_OUTPUT]) {
    throw new Error(`Expected output ${PASSWORD_OUTPUT} in the live template`);
  }
  const outputs = {
    ...template.Outputs,
    [PASSWORD_OUTPUT]: { Value: PASSWORD_PLACEHOLDER },
  };
  return { ...template, Resources: resources, Outputs: outputs };
}

const redacted = redactPasswords(fetchTemplate());
writeFileSync(OUT_FILE, `${JSON.stringify(redacted, null, 2)}\n`);
console.log(
  `Wrote ${OUT_FILE} (${Object.keys(redacted.Resources).length} resources)`,
);
