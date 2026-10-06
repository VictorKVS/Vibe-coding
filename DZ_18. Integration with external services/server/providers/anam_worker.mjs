const kind = process.argv[2];

const apiKey = String(
  process.env.ANAM_API_KEY || ""
).trim();

if (!apiKey) {
  console.error(
    JSON.stringify({
      error: "ANAM_API_KEY is missing"
    })
  );
  process.exit(2);
}

let url;

if (kind === "avatars") {
  url =
    "https://api.anam.ai/v1/avatars?page=1&perPage=20";
}
else if (kind === "voices") {
  url =
    "https://api.anam.ai/v1/voices?page=1&perPage=20";
}
else {
  console.error(
    JSON.stringify({
      error: "Unknown Anam request kind"
    })
  );
  process.exit(3);
}

const controller =
  new AbortController();

const timer = setTimeout(
  () => controller.abort(),
  150000
);

try {
  const response = await fetch(
    url,
    {
      headers: {
        Authorization:
          `Bearer ${apiKey}`,
        Accept:
          "application/json"
      },
      signal:
        controller.signal
    }
  );

  const raw =
    await response.text();

  if (!response.ok) {
    console.error(
      JSON.stringify({
        status:
          response.status,
        body:
          raw.slice(0, 1500)
      })
    );

    process.exit(10);
  }

  // Validate JSON before returning it.
  JSON.parse(raw);

  process.stdout.write(raw);
}
catch (error) {
  console.error(
    JSON.stringify({
      name:
        error?.name,
      message:
        error?.message,
      cause:
        error?.cause?.message
    })
  );

  process.exit(11);
}
finally {
  clearTimeout(timer);
}
