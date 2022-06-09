import { client, customOptions, dataKey, portal } from ".";
import { genKeyPairAndSeed, JsonData, JSONResponse, SkynetClient } from "../src";

// test suite skipped - read more in comments at https://github.com/SkynetLabs/skynet-js/pull/467
describe.skip(`SkyDBV2 end to end integration getJSON/setJSON data race regression integration tests '${portal}'`, () => {
  // REGRESSION TESTS: By creating a gap between setJSON and getJSON, a user
  // could call getJSON, get outdated data, then call setJSON, and overwrite
  // more up to date data with outdated data, but still use a high enough
  // revision number.
  //
  // The fix is that you cannot retrieve the revision number while calling
  // setJSON. You have to use the same revision number that you had when you
  // called getJSON.
  const jsonOld = { message: 1 };
  const jsonNew = { message: 2 };

  const delays = [0, 10, 100, 500];

  const concurrentAccessError = "Concurrent access prevented in SkyDB";
  const registryUpdateError = "Unable to update the registry";

  const getJSONWithDelay = async function (
    client: SkynetClient,
    delay: number,
    publicKey: string,
    dataKey: string
  ): Promise<JSONResponse> {
    await new Promise((r) => setTimeout(r, delay));
    return await client.dbV2.getJSON(publicKey, dataKey);
  };
  const setJSONWithDelay = async function (
    client: SkynetClient,
    delay: number,
    privateKey: string,
    dataKey: string,
    data: JsonData
  ) {
    await new Promise((r) => setTimeout(r, delay));
    return await client.dbV2.setJSON(privateKey, dataKey, data);
  };

  it.each(delays)(
    "should not get old data when getJSON is called after setJSON on a single client with a '%s' ms delay and getJSON doesn't fail",
    async (delay) => {
      const { publicKey, privateKey } = await genKeyPairAndSeed();

      // Set the data.
      await client.dbV2.setJSON(privateKey, dataKey, jsonOld);

      // Try to invoke the data race.
      let receivedJson;
      try {
        // Get the data while also calling setJSON.
        [{ data: receivedJson }] = await Promise.all([
          getJSONWithDelay(client, delay, publicKey, dataKey),
          setJSONWithDelay(client, 0, privateKey, dataKey, jsonNew),
        ]);
      } catch (e) {
        if ((e as Error).message.includes(concurrentAccessError)) {
          // The data race condition has been prevented and we received the
          // expected error. Return from test early.
          //
          // NOTE: I've manually confirmed that both code paths (no error, and
          // return on expected error) are hit.
          return;
        }

        // Unexpected error, throw.
        throw e;
      }

      // Data race did not occur, getJSON should have latest JSON.
      expect(receivedJson).toEqual(jsonNew);
    }
  );

  // NOTE: We can't guarantee that data won't be lost if two (or more) actors
  // write to the registry at the same time, but we can guarantee that the
  // final state will be the desired final state by at least one of the
  // actors. One of the two clients will lose, but the other will win and be
  // consistent, so the data won't be corrupt, it'll just be missing one
  // update.
  it.each(delays)(
    "should get either old or new data when getJSON is called after setJSON on two different clients with a '%s' ms delay",
    async (delay) => {
      // Create two new clients with a fresh revision cache.
      const client1 = new SkynetClient(portal, customOptions);
      const client2 = new SkynetClient(portal, customOptions);
      const { publicKey, privateKey } = await genKeyPairAndSeed();

      // Get revision entry cache handles.
      const cachedRevisionEntry1 = await client1.dbV2.revisionNumberCache.getRevisionAndMutexForEntry(
        publicKey,
        dataKey
      );
      const cachedRevisionEntry2 = await client2.dbV2.revisionNumberCache.getRevisionAndMutexForEntry(
        publicKey,
        dataKey
      );

      // Set the initial data.
      {
        await client1.dbV2.setJSON(privateKey, dataKey, jsonOld);
        expect(cachedRevisionEntry1.revision.toString()).toEqual("0");
        expect(cachedRevisionEntry2.revision.toString()).toEqual("-1");
      }

      // Call getJSON and setJSON concurrently on different clients -- both
      // should succeeed.
      {
        // Get the data while also calling setJSON.
        const [_, { data: receivedJson }] = await Promise.all([
          setJSONWithDelay(client1, 0, privateKey, dataKey, jsonNew),
          getJSONWithDelay(client2, delay, publicKey, dataKey),
        ]);

        // See if we got the new or old data.
        expect(receivedJson).not.toBeNull();
        expect(cachedRevisionEntry1.revision.toString()).toEqual("1");
        if (receivedJson?.message === jsonNew.message) {
          expect(cachedRevisionEntry2.revision.toString()).toEqual("1");
          // Return if we got the new data -- both clients are in sync.
          //
          // NOTE: I've manually confirmed that both code paths (old data and
          // new data) are hit.
          return;
        }
        // client2 should have old data and cached revision at this point.
        expect(receivedJson).toEqual(jsonOld);
        expect(cachedRevisionEntry2.revision.toString()).toEqual("0");
      }

      // If we got old data and an old revision from getJSON, the client may
      // still be able to write to that entry, overwriting the new data.
      //
      // Try to update the entry with client2 which has the old revision.
      const updatedJson = { message: 3 };
      let expectedJson: JsonData;
      try {
        await client2.dbV2.setJSON(privateKey, dataKey, updatedJson);
        expectedJson = updatedJson;
      } catch (e) {
        // Catches both "doesn't have enough pow" and "provided revision number
        // is already registered" errors.
        if ((e as Error).message.includes(registryUpdateError)) {
          // NOTE: I've manually confirmed that both code paths (no error, and
          // return on expected error) are hit.
          expectedJson = jsonNew;
        } else {
          // Unexpected error, throw.
          throw e;
        }
      }

      // The entry should have the overriden, updated data at this point.
      await Promise.all([
        async () => {
          const { data: receivedJson } = await client1.dbV2.getJSON(publicKey, dataKey);
          expect(cachedRevisionEntry1.revision.toString()).toEqual("1");
          expect(receivedJson).toEqual(expectedJson);
        },
        async () => {
          const { data: receivedJson } = await client2.dbV2.getJSON(publicKey, dataKey);
          expect(cachedRevisionEntry2.revision.toString()).toEqual("1");
          expect(receivedJson).toEqual(expectedJson);
        },
      ]);
    }
  );

  it.each(delays)(
    "should make sure that two concurrent setJSON calls on a single client with a '%s' ms delay either fail with the right error or succeed ",
    async (delay) => {
      const { publicKey, privateKey } = await genKeyPairAndSeed();

      // Try to invoke two concurrent setJSON calls.
      try {
        await Promise.all([
          setJSONWithDelay(client, delay, privateKey, dataKey, jsonNew),
          setJSONWithDelay(client, 0, privateKey, dataKey, jsonOld),
        ]);
      } catch (e) {
        if ((e as Error).message.includes(concurrentAccessError)) {
          // The data race condition has been prevented and we received the
          // expected error. Return from test early.
          //
          // NOTE: I've manually confirmed that both code paths (no error, and
          // return on expected error) are hit.
          return;
        }

        // Unexpected error, throw.
        throw e;
      }

      // Data race did not occur, getJSON should get latest JSON.
      const { data: receivedJson } = await client.dbV2.getJSON(publicKey, dataKey);
      expect(receivedJson).toEqual(jsonNew);
    }
  );

  it.each(delays)(
    "should make sure that two concurrent setJSON calls on different clients with a '%s' ms delay fail with the right error or succeed",
    async (delay) => {
      // Create two new clients with a fresh revision cache.
      const client1 = new SkynetClient(portal, customOptions);
      const client2 = new SkynetClient(portal, customOptions);
      const { publicKey, privateKey } = await genKeyPairAndSeed();

      // Try to invoke two concurrent setJSON calls.
      try {
        await Promise.all([
          setJSONWithDelay(client2, delay, privateKey, dataKey, jsonNew),
          setJSONWithDelay(client1, 0, privateKey, dataKey, jsonOld),
        ]);
      } catch (e) {
        if ((e as Error).message.includes(registryUpdateError)) {
          // The data race condition has been prevented and we received the
          // expected error. Return from test early.
          //
          // NOTE: I've manually confirmed that both code paths (no error, and
          // return on expected error) are hit.
          return;
        }

        // Unexpected error, throw.
        throw e;
      }

      // Data race did not occur, getJSON should get one of the JSON values.
      let client3;
      if (Math.random() < 0.5) {
        client3 = client1;
      } else {
        client3 = client2;
      }
      const { data: receivedJson } = await client3.dbV2.getJSON(publicKey, dataKey);
      expect([jsonOld, jsonNew]).toContainEqual(receivedJson);
    }
  );
});
