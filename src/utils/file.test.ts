import { getFileMimeType, getRelativeFilePath, getRootDirectory } from "./file";

describe("getRelativeFilePath", () => {
  const filepaths = [
    ["abc/def", "def"],
    ["./abc/def", "def"],
    ["/abc/def.txt", "def.txt"],
  ];

  it.each(filepaths)("the relative file path for a file with the path %s should be %s", (filepath, directory) => {
    const file = new File(["test contents"], "foo");
    // @ts-expect-error We spoof the path here which is present in browsers but not in the File standard.
    file.path = filepath;
    expect(getRelativeFilePath(file)).toEqual(directory);
  });
});

describe("getRootDirectory", () => {
  const filepaths = [
    ["abc/def", "abc"],
    ["./abc/def", "abc"],
    ["/abc/def", "abc"],
  ];

  it.each(filepaths)("the root directory for a file with the path %s should be %s", (filepath, directory) => {
    const file = new File(["test contents"], "foo");
    // @ts-expect-error We spoof the path here which is present in browsers but not in the File standard.
    file.path = filepath;
    expect(getRootDirectory(file)).toEqual(directory);
  });
});

describe("getFileMimeType", () => {
  it("should return file type if type is specified on a file", () => {
    const file = new File([], "foobar.baz", { type: "foo/bar" });

    expect(getFileMimeType(file)).toEqual("foo/bar");
  });

  describe("when there is no file type", () => {
    it("should guess the file type based on the extension", () => {
      // list a few popular extensions just to be sure the mime db works
      expect(getFileMimeType(new File([], "foo.html"))).toEqual("text/html");
      expect(getFileMimeType(new File([], "foo.txt"))).toEqual("text/plain");
      expect(getFileMimeType(new File([], "foo.json"))).toEqual("application/json");
    });

    it("should return empty file type if there is no file extension", () => {
      const file = new File([], "foobar");

      expect(getFileMimeType(file)).toEqual("");
    });

    it("should return empty file type if the extension is not matched to any mime type", () => {
      const file = new File([], "foobar.baz");

      expect(getFileMimeType(file)).toEqual("");
    });
  });
});
