import path from 'path';
import dotenv from 'dotenv';
import { generateApi } from 'swagger-typescript-api';

dotenv.config();

const SERVICE_NAME_TO_ENDPOINT_MAPPING = {
  user: process.env.USER_SERVICE_ENDPOINT,
  auth: process.env.AUTH_SERVICE_ENDPOINT,
  internal: process.env.INTERNAL_SERVICE_ENDPOINT,
};

async function bootstrap() {
  // for each service, fetch the openapi schema and generate types
  for (const [serviceName, endpoint] of Object.entries(SERVICE_NAME_TO_ENDPOINT_MAPPING)) {
    try {
      const data = await fetch(`${endpoint}/docs-json`);
      if (!data.ok) {
        console.warn(`No Swagger JSON file found on ${serviceName} service`);
        continue;
      }
      void data.json();
    } catch (e) {
      console.warn(`Failed to fetch Swagger JSON file from ${serviceName} service`);
      continue;
    }

    console.info(`Generating types for ${serviceName} service`);
    await generateApi({
      name: `${serviceName}`,
      url: `${endpoint}/docs-json`,
      output: path.resolve(process.cwd(), './libs/api/src/'),
      httpClientType: 'axios',
      apiClassName: `${serviceName.charAt(0).toUpperCase()}${serviceName.slice(1)}Api`,
      silent: true,
      unwrapResponseData: true,
      // TODO: Should remove in the future by adding the correct response type to all endpoints
      defaultResponseType: 'any',
      moduleNameFirstTag: true,

      // setup hook that for operation id of format somethingController_method, the name will be method
      hooks: {
        onCreateRouteName(routeNameInfo) {
          routeNameInfo.usage = routeNameInfo.usage.split('Controller')[1];
          routeNameInfo.original = routeNameInfo.original.split('Controller')[1];
          routeNameInfo.usage = routeNameInfo.usage.charAt(0).toLowerCase() + routeNameInfo.usage.slice(1);
          routeNameInfo.original = routeNameInfo.original.charAt(0).toLowerCase() + routeNameInfo.original.slice(1);
        },
      },
    });
  }

  return;
}

void bootstrap();
