const axios = require("axios");
const { parse } = require("yaml");
const fs = require("fs");

// Hardcoded configuration values
const API_URL = "http://localhost.localdomain:8080";
const DEFAULT_ORG = process.env.WPRO_ORG;
const ORGS_TOKEN_PAIR = {
  [DEFAULT_ORG]: process.env.WPRO_TOKEN,
};

const PROTOTYPE_RESOURCE =
  API_URL + "/rest/org/groups/PAGE_COMPONENT_PROTOTYPE/";
const SERVICE_PUBLISH_RESOURCE =
  API_URL + "/rest/org/groups/service_pages/publish";
let ACCESS_TOKEN = ORGS_TOKEN_PAIR[DEFAULT_ORG];

const bearerAuthConfig = {
  headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
};

// Get YAML file path from command-line arguments
const fileLocation = process.argv[2];

if (!fileLocation) {
  console.error(
    "No YAML file path provided. Usage: node publish.js <path-to-yaml-file>",
  );
  process.exit(1);
}

// Helper function to map status codes to error messages
function getErrorMessage(status) {
  const messages = {
    400: "Bad Request - The server could not process the request.",
    401: "Unauthorized - Please check your authentication token.",
    403: "Forbidden - You do not have permission to perform this action.",
    404: "Not Found - The endpoint or resource does not exist.",
    500: "Internal Server Error - Please try again later.",
    503: "Service Unavailable - The server is currently unable to handle the request.",
  };
  return messages[status] || "An unknown error occurred.";
}


async function handleComponentUpload() {
  if (!PROTOTYPE_RESOURCE) {
    console.error(
      "No valid URL configuration found. Make sure to add them in the script.",
    );
    throw new Error();
  }

  if (!ACCESS_TOKEN) {
    console.error("No valid ACCESS_TOKEN configuration found.");
    console.error(
      "Component published failed. No valid ACCESS_TOKEN configuration found. Make sure to add them in the script.",
    );
    throw new Error();
  }

  const file = fs.readFileSync(fileLocation, "utf8");

  if (!file) {
    console.error("Failed loading yaml file, aborting publish!");
    throw new Error();
  }

  const data = parse(file);
  const groupData = data.settings;

  if (!groupData) {
    console.error(
      "No groupData present in the returned file, aborting publish!",
    );
    throw new Error();
  }

  const dataToPush = {
    groupData: groupData,
    groupId: data.groupId,
    type: "PAGE_COMPONENT_PROTOTYPE",
  };

  await uploadComponent(PROTOTYPE_RESOURCE, dataToPush);
  await publishFullService();
}

async function uploadComponent(url, dataToPush) {
  try {
    const res = await axios.post(url, dataToPush, bearerAuthConfig);
    if (res.data) {
      console.log("Component successfully published with POST!");
    }
  } catch (error) {
    if (error.response) {
      const { status } = error.response;
      console.error(`POST failed with status ${status}: ${getErrorMessage(status)}`);
    } else {
      console.error("POST failed: No response from server", error.message);
    }

    try {
      console.log("Attempting to publish component with PUT...");

      const res = await axios.put(
        `${url}${dataToPush.groupId}`,
        dataToPush,
        bearerAuthConfig,
      );
      if (res && res.data) {
        console.log("Component successfully published with PUT!");
      }
    } catch (error) {
      if (error.response) {
        const { status } = error.response;
        console.error(`PUT failed with status ${status}: ${getErrorMessage(status)}`);
      } else {
        console.error("PUT failed: No response from server", error.message);
      }
    }
  }
}

async function publishFullService() {
  try {
    if (!SERVICE_PUBLISH_RESOURCE) {
      return;
    }
    const res = await axios.post(
      SERVICE_PUBLISH_RESOURCE,
      {},
      bearerAuthConfig,
    );
    if (res.status === 204) {
      console.log("Full service publish successful!");
    }
  } catch (error) {
    console.error("Full service publish failed!");
    throw Error();
  }
}

// Run the script
handleComponentUpload().catch((error) => {
  console.error("Error during component upload:", error);
  throw Error();
});
