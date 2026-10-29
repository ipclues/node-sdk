# IPClues Node.js SDK

Official Node.js SDK for the [IPClues](https://ipclues.com) IP intelligence API.

## Requirements

- Node >= 20
- An IPClues API key

## Quick start

```ts
import { Client, Database } from "@ipclues/sdk";

const client = new Client("YOUR_API_KEY");

const response = await client.lookup("1.1.1.1", {
  db: [Database.GeoI3Lite, Database.NetI3Identity],
});

console.log(response.data); // original decoded response body
console.log(response.metadata); // Metadata drived from HTTP headers
console.log(response.metadata.status); // HTTP status code
console.log(response.metadata.reason); // HTTP status reason
console.log(response.metadata.credits_remaining); // remaining credits
```

## Response behavior

The SDK wraps the API response body and HTTP metadata:

- `response.data`: original decoded response body.
- `response.metadata.status`: HTTP status code.
- `response.metadata.request_id`: `I3-Request-Id` header.
- `response.metadata.credits_charged` and `credits_remaining`: credit usage headers.
- `response.metadata.databases` and `database_versions`: response database headers.
- `response.metadata.rate_limit`: parsed rate-limit headers.

HTTP error responses such as 401, 402, and 429 are returned as `APIResponse` objects too. Network failures and timeouts raise exceptions.

## License

MIT
