import dotenv from 'dotenv';
import path from 'path';
import { generateApi } from 'swagger-typescript-api';

dotenv.config();

const SERVICE_NAME_TO_ENDPOINT_MAPPING = {
  user: process.env.USER_SERVICE_ENDPOINT,
  auth: process.env.AUTH_SERVICE_ENDPOINT,
};

async function bootstrap() {
  // for each service, fetch the openapi schema and generate types
  for (const [serviceName, endpoint] of Object.entries(
    SERVICE_NAME_TO_ENDPOINT_MAPPING,
  )) {
    try {
      const data = await fetch(`${endpoint}/docs-json`);
      if (!data.ok) {
        console.warn(`No Swagger JSON file found on ${serviceName} service`);
        continue;
      }
      void data.json();
    } catch (e) {
      console.warn(
        `Failed to fetch Swagger JSON file from ${serviceName} service`,
      );
      continue;
    }

    console.info(`Generating types for ${serviceName} service`);
    await generateApi({
      name: `${serviceName}`,
      url: `${endpoint}/docs-json`,
      output: path.resolve(process.cwd(), `./libs/api/src/`),
      httpClientType: 'axios',
      apiClassName: `${serviceName.charAt(0).toUpperCase()}${serviceName.slice(
        1,
      )}Api`,
      silent: true,
      unwrapResponseData: true,
      // TODO: Should remove in the future by adding the correct response type to all endpoints
      defaultResponseType: 'any',
    });
  }

  return;
}

void bootstrap();
