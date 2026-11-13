import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

function toFileSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function saveImage(filename: string, data: Buffer): Promise<void> {
  const bucket = process.env.IMAGES_BUCKET;
  if (bucket) {
    await new S3Client({}).send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `images/${filename}`,
        Body: data,
        ContentType: 'image/png',
      }),
    );
    return;
  }
  const imagesDir = join(process.cwd(), 'public', 'images');
  mkdirSync(imagesDir, { recursive: true });
  writeFileSync(join(imagesDir, filename), data);
}

export async function generateProductImage(
  productName: string,
  description: string,
): Promise<string> {
  const prompt = `professional product photography of ${productName}, ${description}, clean white background, studio lighting, high quality, commercial photography`;

  const payload = {
    taskType: 'TEXT_IMAGE',
    textToImageParams: {
      text: prompt,
      negativeText:
        'people, anatomy, hands, low quality, low resolution, low detail, blurry, distorted',
    },
    imageGenerationConfig: {
      numberOfImages: 1,
      quality: 'standard',
      height: 512,
      width: 512,
      cfgScale: 7.0,
    },
  };

  const command = new InvokeModelCommand({
    modelId: 'amazon.nova-canvas-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const response = await client.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  const imageBase64 = result.images[0];

  const filename = `${Date.now()}-${toFileSlug(productName)}.png`;
  await saveImage(filename, Buffer.from(imageBase64, 'base64'));

  return `/images/${filename}`;
}
