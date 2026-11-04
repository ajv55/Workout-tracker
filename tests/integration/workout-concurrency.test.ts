import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, test, type TestContext } from "node:test";
import { z } from "zod";

const setSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i),
  version: z.number().int().nonnegative(),
  reps: z.number().nullable(),
  weightKg: z.number().nullable(),
  completed: z.boolean(),
  plannedRestSeconds: z.number().nullable(),
  restStartedAt: z.string().nullable(),
  restEndedAt: z.string().nullable(),
});
type SavedSet = z.infer<typeof setSchema>;
const workoutSchema = z.object({ workout: z.object({
  exercises: z.array(z.object({ id: z.string(), sets: z.array(setSchema) })),
}) });
const objectId = z.string().regex(/^[a-f\d]{24}$/i);

class TestClient {
  private cookies = new Map<string, string>();
  constructor(readonly origin: string) {}

  async request(path: string, init: RequestInit = {}) {
    assert.ok(path.startsWith("/api/"), "Only API paths are allowed");
    const headers = new Headers(init.headers);
    headers.set("Cookie", [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; "));
    const response = await fetch(new URL(path, this.origin), {
      ...init, headers, redirect: "manual", cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const equals = pair.indexOf("=");
      if (equals < 1) continue;
      const name = pair.slice(0, equals);
      const value = pair.slice(equals + 1);
      if (/max-age=0(?:;|$)/i.test(cookie) || value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    return response;
  }

  json(path: string, method: string, body: unknown) {
    return this.request(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async signIn(email: string, password: string) {
    const csrfResponse = await this.request("/api/auth/csrf");
    assert.equal(csrfResponse.status, 200, "CSRF endpoint must return 200");
    const { csrfToken } = z.object({ csrfToken: z.string().min(1) }).parse(await csrfResponse.json());
    const response = await this.request("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email, password, csrfToken, callbackUrl: `${this.origin}/` }).toString(),
    });
    assert.ok([200, 302, 303].includes(response.status), "Credentials callback failed");
    // A redirect alone is not evidence of a successful sign-in.
    const sessionResponse = await this.request("/api/auth/session");
    assert.equal(sessionResponse.status, 200);
    const session = z.object({ user: z.object({ id: objectId, email: z.string() }) })
      .safeParse(await sessionResponse.json());
    assert.ok(session.success, "No authenticated session. Check the dedicated credentials account and server logs.");
    assert.equal(session.data.user.email.toLowerCase(), email.toLowerCase(), "Unexpected signed-in account");
    return session.data.user.id;
  }
}

function configuration() {
  const value = process.env.INTEGRATION_BASE_URL ?? "http://localhost:3000";
  const url = new URL(value);
  assert.ok(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash,
    "INTEGRATION_BASE_URL must be a local HTTP origin, such as http://localhost:3000");
  const email = process.env.INTEGRATION_EMAIL?.trim();
  const password = process.env.INTEGRATION_PASSWORD;
  assert.ok(email && password, "Set INTEGRATION_EMAIL and INTEGRATION_PASSWORD in .env.integration.local");
  const secondEmail = process.env.INTEGRATION_SECOND_EMAIL?.trim();
  const secondPassword = process.env.INTEGRATION_SECOND_PASSWORD;
  assert.ok(secondEmail && secondPassword,
    "Set INTEGRATION_SECOND_EMAIL and INTEGRATION_SECOND_PASSWORD in .env.integration.local");
  assert.notEqual(secondEmail.toLowerCase(), email.toLowerCase(),
    "Use two different existing credentials accounts");
  return { origin: url.origin, email, password, secondEmail, secondPassword };
}

describe("Workout concurrency and access control through the real API", { concurrency: false }, () => {
  let client: TestClient;
  let secondClient: TestClient;
  let anonymousClient: TestClient;
  let sharedExerciseId: string;

  before(async () => {
    const config = configuration();
    client = new TestClient(config.origin);
    secondClient = new TestClient(config.origin);
    anonymousClient = new TestClient(config.origin);
    const ownerId = await client.signIn(config.email, config.password);
    const secondId = await secondClient.signIn(config.secondEmail, config.secondPassword);
    assert.notEqual(ownerId, secondId, "Isolation requires two distinct session user IDs");
    const anonymousSession = await anonymousClient.request("/api/auth/session");
    assert.equal(anonymousSession.status, 200);
    assert.equal(await anonymousSession.json(), null, "Anonymous client must not have a session");
    // Reuse the seeded catalog; never create persistent custom catalog entries.
    for (let page = 1; page <= 100; page++) {
      const response = await client.request(`/api/exercises?page=${page}&pageSize=50`);
      assert.equal(response.status, 200, "Exercise catalog must be available");
      const data = z.object({
        exercises: z.array(z.object({ id: objectId, isCustom: z.boolean() })),
        pagination: z.object({ hasNextPage: z.boolean() }),
      }).parse(await response.json());
      const shared = data.exercises.find((exercise) => !exercise.isCustom);
      if (shared) { sharedExerciseId = shared.id; return; }
      if (!data.pagination.hasNextPage) break;
    }
    throw new Error("No shared exercise found. Run your shared catalog seed before these tests.");
  });

  async function fixture(t: TestContext) {
    const title = `Integration concurrency ${randomUUID()}`;
    const fixtureState: { workoutId?: string } = {};
    // Register cleanup before creation, including recovery from a lost create response.
    t.after(async () => {
      let ids: string[];
      if (fixtureState.workoutId) ids = [fixtureState.workoutId];
      else {
        const list = await client.request("/api/workouts");
        assert.equal(list.status, 200, `Cleanup lookup failed for ${title}`);
        const body = z.object({ workouts: z.array(z.object({ id: objectId, title: z.string() })) })
          .parse(await list.json());
        ids = body.workouts.filter((workout) => workout.title === title).map((workout) => workout.id);
      }
      for (const id of ids) {
        const response = await client.request(`/api/workouts/${id}`, { method: "DELETE" });
        assert.ok([200, 404].includes(response.status), `Cleanup failed for temporary workout ${id}`);
        const check = await client.request(`/api/workouts/${id}`);
        assert.equal(check.status, 404, `Temporary workout ${id} still exists after cleanup`);
      }
    });

    const created = await client.json("/api/workouts", "POST", { title, durationMinutes: 10 });
    assert.equal(created.status, 201, "Fixture workout creation failed");
    const workoutId = z.object({ workout: z.object({ id: objectId }) }).parse(await created.json()).workout.id;
    fixtureState.workoutId = workoutId;
    t.diagnostic(`Temporary workout: ${workoutId}`);
    const attached = await client.json(`/api/workouts/${workoutId}/exercises`, "POST", { exerciseId: sharedExerciseId });
    assert.equal(attached.status, 201, "Fixture attachment failed");
    const attachmentId = z.object({ workoutExercise: z.object({ id: objectId }) })
      .parse(await attached.json()).workoutExercise.id;
    const setsUrl = `/api/workouts/${workoutId}/exercises/${attachmentId}/sets`;
    const createdSets = await client.json(setsUrl, "POST", { count: 1 });
    assert.equal(createdSets.status, 201, "Fixture set creation failed");
    const blank = z.object({ sets: z.array(setSchema).length(1) }).parse(await createdSets.json()).sets[0];
    const setUrl = `${setsUrl}/${blank.id}`;
    const readyResponse = await client.json(setUrl, "PATCH", {
      expectedVersion: blank.version,
      changes: { reps: 10, weightKg: 20, completed: true, plannedRestSeconds: 90 },
    });
    assert.equal(readyResponse.status, 200, "Fixture set setup failed");
    const ready = z.object({ set: setSchema }).parse(await readyResponse.json()).set;
    const id = workoutId;
    return {
      ready, setUrl, workoutId, attachmentId, setsUrl,
      async snapshot() {
        const response = await client.request(`/api/workouts/${id}`);
        assert.equal(response.status, 200, "Owner must still be able to read the fixture");
        const body = z.object({ workout: z.record(z.string(), z.unknown()) }).parse(await response.json());
        return body.workout;
      },
      async load() {
        const response = await client.request(`/api/workouts/${id}`);
        assert.equal(response.status, 200);
        const body = workoutSchema.parse(await response.json());
        const saved = body.workout.exercises.find((item) => item.id === attachmentId)
          ?.sets.find((item) => item.id === blank.id);
        assert.ok(saved, "Fixture set missing from workout GET");
        return saved;
      },
    };
  }

  async function savedResponse(response: Response): Promise<SavedSet> {
    return z.object({ set: setSchema }).parse(await response.json()).set;
  }

  async function race(requests: Promise<Response>[]) {
    // Wait for every write to settle before asserting or running cleanup.
    const settled = await Promise.allSettled(requests);
    const responses = settled.map((result) => {
      if (result.status === "rejected") throw new Error("Race request failed. Check the app is running and inspect its logs.");
      return result.value;
    });
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409],
      "Exactly one racing request must succeed and one must conflict");
    const winnerIndex = responses.findIndex((response) => response.status === 200);
    const winner = await savedResponse(responses[winnerIndex]);
    // P2034 transaction conflicts may omit a structured conflict reason.
    const loser = responses.find((response) => response.status === 409);
    assert.ok(loser);
    await loser.arrayBuffer();
    return { winnerIndex, winner };
  }

  test("rejects a stale save and permits a deliberate edit after reloading", async (t) => {
    const f = await fixture(t);
    const first = await client.json(f.setUrl, "PATCH", {
      expectedVersion: f.ready.version, changes: { reps: 12 },
    });
    assert.equal(first.status, 200);
    assert.equal((await savedResponse(first)).version, f.ready.version + 1);
    const stale = await client.json(f.setUrl, "PATCH", {
      expectedVersion: f.ready.version, changes: { reps: 8 },
    });
    assert.equal(stale.status, 409);
    const conflict = z.object({ reason: z.literal("version-conflict"), currentSet: setSchema })
      .parse(await stale.json());
    assert.equal(conflict.currentSet.reps, 12);
    const latest = await f.load();
    assert.equal(latest.reps, 12);
    assert.equal(latest.version, f.ready.version + 1);
    const retry = await client.json(f.setUrl, "PATCH", {
      expectedVersion: latest.version, changes: { reps: 10 },
    });
    assert.equal(retry.status, 200);
    const final = await f.load();
    assert.equal(final.reps, 10);
    assert.equal(final.version, latest.version + 1);
  });

  test("accepts only one of two simultaneous saves with the same version", async (t) => {
    const f = await fixture(t);
    const values = [12, 8];
    const { winnerIndex, winner } = await race(values.map((reps) =>
      client.json(f.setUrl, "PATCH", { expectedVersion: f.ready.version, changes: { reps } })));
    const after = await f.load();
    assert.equal(after.reps, values[winnerIndex]);
    assert.equal(after.version, f.ready.version + 1);
    assert.equal(winner.version, after.version);
    assert.equal(after.weightKg, f.ready.weightKg);
    assert.equal(after.restStartedAt, null);
  });

  test("accepts only one of a simultaneous rest start and set edit", async (t) => {
    const f = await fixture(t);
    const { winnerIndex, winner } = await race([
      client.json(`${f.setUrl}/rest`, "POST", { expectedVersion: f.ready.version, action: "START_REST" }),
      client.json(f.setUrl, "PATCH", { expectedVersion: f.ready.version, changes: { reps: 8 } }),
    ]);
    const restWon = winnerIndex === 0;
    const after = await f.load();
    assert.equal(after.version, f.ready.version + 1);
    assert.equal(after.reps, restWon ? f.ready.reps : 8);
    assert.equal(after.restEndedAt, null);
    if (restWon) {
      assert.ok(winner.restStartedAt);
      assert.equal(after.restStartedAt, winner.restStartedAt);
    } else assert.equal(after.restStartedAt, null);
    assert.equal(after.plannedRestSeconds, 90);
  });

  async function assertAccessBlocked(
    t: TestContext,
    actor: TestClient,
    expectedStatus: 401 | 404,
  ) {
    const f = await fixture(t);
    const before = await f.snapshot();
    const workoutUrl = `/api/workouts/${f.workoutId}`;
    const attachmentUrl = `${workoutUrl}/exercises/${f.attachmentId}`;
    const attempts: Array<{ label: string; path: string; method: string; body?: unknown }> = [
      { label: "read workout", path: workoutUrl, method: "GET" },
      { label: "edit workout", path: workoutUrl, method: "PATCH", body: { title: "Unauthorized change" } },
      { label: "delete workout", path: workoutUrl, method: "DELETE" },
      { label: "attach exercise", path: `${workoutUrl}/exercises`, method: "POST", body: { exerciseId: sharedExerciseId } },
      { label: "remove exercise", path: attachmentUrl, method: "DELETE" },
      { label: "create sets", path: f.setsUrl, method: "POST", body: { count: 1 } },
      { label: "edit set", path: f.setUrl, method: "PATCH", body: {
        expectedVersion: f.ready.version, changes: { reps: 25 },
      } },
      { label: "delete set", path: f.setUrl, method: "DELETE" },
      { label: "start rest", path: `${f.setUrl}/rest`, method: "POST", body: {
        expectedVersion: f.ready.version, action: "START_REST",
      } },
      { label: "end rest", path: `${f.setUrl}/rest`, method: "POST", body: {
        expectedVersion: f.ready.version, action: "END_REST",
      } },
    ];
    for (const attempt of attempts) {
      const response = attempt.body === undefined
        ? await actor.request(attempt.path, { method: attempt.method })
        : await actor.json(attempt.path, attempt.method, attempt.body);
      assert.equal(response.status, expectedStatus,
        `${attempt.label} must return ${expectedStatus}`);
      // Error responses must not contain workout data or a conflict snapshot.
      z.object({ message: z.string().min(1) }).strict().parse(await response.json());
      assert.deepEqual(await f.snapshot(), before,
        `${attempt.label} must leave the owner's saved workout unchanged`);
    }
    if (expectedStatus === 404) {
      const list = await actor.request("/api/workouts");
      assert.equal(list.status, 200, "Account B can list its own workouts");
      const listed = z.object({ workouts: z.array(z.object({ id: objectId })) }).parse(await list.json());
      assert.ok(!listed.workouts.some((workout) => workout.id === f.workoutId),
        "Account B's list must exclude A's temporary workout");
    }
    t.diagnostic(`Verified ${attempts.length} rejected operations and unchanged owner data`);
  }

  test("anonymous requests receive 401 without changing owner data", async (t) => {
    await assertAccessBlocked(t, anonymousClient, 401);
  });

  test("account B receives 404 for account A records without changing them", async (t) => {
    await assertAccessBlocked(t, secondClient, 404);
  });

});
