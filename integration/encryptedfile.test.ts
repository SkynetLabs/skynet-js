import { client, portal } from ".";
+describe(`Encrypted File API integration tests for portal '${portal}'`, () => {
  const userID = "4dfb9ce035e4e44711c1bb0a0901ce3adc2a928b122ee7b45df6ac47548646b0";
  // Path seed for "test.hns/encrypted".
  const pathSeed = "fe2c5148646532a442dd117efab3ff2a190336da506e363f80fb949513dab811";

  it("Should get existing encrypted JSON", async () => {
    const expectedJson = { message: "foo" };

    const { data } = await client.file.getJSONEncrypted(userID, pathSeed);

    expect(data).toEqual(expectedJson);
  });

  it("Should return null for inexistant encrypted JSON", async () => {
    const pathSeed = "a".repeat(64);

    const { data } = await client.file.getJSONEncrypted(userID, pathSeed);

    expect(data).toBeNull();
  });
});
