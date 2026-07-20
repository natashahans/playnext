import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const emailA = process.env.PLAYNEXT_TEST_USER_A_EMAIL;
const passwordA = process.env.PLAYNEXT_TEST_USER_A_PASSWORD;
const emailB = process.env.PLAYNEXT_TEST_USER_B_EMAIL;
const passwordB = process.env.PLAYNEXT_TEST_USER_B_PASSWORD;
const configured = Boolean(url && anonKey && emailA && passwordA && emailB && passwordB);

test("live RLS prevents one signed-in user reading another user's rows", { skip: !configured }, async () => {
  const clientA = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const clientB = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const [{ data: authA, error: errorA }, { data: authB, error: errorB }] = await Promise.all([
    clientA.auth.signInWithPassword({ email: emailA!, password: passwordA! }),
    clientB.auth.signInWithPassword({ email: emailB!, password: passwordB! }),
  ]);
  assert.ifError(errorA);
  assert.ifError(errorB);
  assert.ok(authA.user?.id);
  assert.ok(authB.user?.id);
  assert.notEqual(authA.user.id, authB.user.id);

  const { data: visibleProfile, error: profileError } = await clientB
    .from("profiles")
    .select("id")
    .eq("id", authA.user.id);
  assert.ifError(profileError);
  assert.deepEqual(visibleProfile, []);

  const { data: visibleGames, error: gamesError } = await clientB
    .from("user_games")
    .select("id")
    .eq("user_id", authA.user.id);
  assert.ifError(gamesError);
  assert.deepEqual(visibleGames, []);

  await Promise.all([clientA.auth.signOut(), clientB.auth.signOut()]);
});
