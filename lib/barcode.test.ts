import { describe, expect, it } from "vitest";
import { confirmRead, expandUpcE, hasValidCheckDigit, normalizeBarcode } from "./barcode";

describe("hasValidCheckDigit", () => {
  it("accepts real barcodes", () => {
    expect(hasValidCheckDigit("5000112637922")).toBe(true); // EAN-13
    expect(hasValidCheckDigit("3017620422003")).toBe(true); // EAN-13
    expect(hasValidCheckDigit("036000291452")).toBe(true); // UPC-A
    expect(hasValidCheckDigit("96385074")).toBe(true); // EAN-8
  });

  it("refuses a code with one digit misread", () => {
    expect(hasValidCheckDigit("5000112637923")).toBe(false);
    expect(hasValidCheckDigit("5000112687922")).toBe(false);
  });

  it("refuses wrong lengths and letters", () => {
    expect(hasValidCheckDigit("1234567")).toBe(false);
    expect(hasValidCheckDigit("123456789012345")).toBe(false);
    expect(hasValidCheckDigit("50001126379a2")).toBe(false);
  });
});

describe("expandUpcE", () => {
  it("puts the dropped zeros back", () => {
    expect(expandUpcE("04252614")).toBe("042100005264"); // last digit 0-2
    expect(expandUpcE("01234531")).toBe("012300000451"); // 3
    expect(expandUpcE("01234542")).toBe("012340000052"); // 4
    expect(expandUpcE("01234576")).toBe("012345000076"); // 5-9
  });

  it("refuses codes that aren't UPC-E shaped", () => {
    expect(expandUpcE("94252614")).toBeNull(); // must start with 0 or 1
    expect(expandUpcE("0425261")).toBeNull();
  });
});

describe("normalizeBarcode", () => {
  it("keeps EAN-13 as it is", () => {
    expect(normalizeBarcode("5000112637922")).toBe("5000112637922");
  });

  it("saves UPC-A as 13 digits, so it matches the same product as EAN-13", () => {
    expect(normalizeBarcode("036000291452")).toBe("0036000291452");
    expect(normalizeBarcode("0036000291452")).toBe("0036000291452");
  });

  it("keeps EAN-8 as 8 digits", () => {
    expect(normalizeBarcode("96385074")).toBe("96385074");
    expect(normalizeBarcode("96385074", "ean_8")).toBe("96385074");
  });

  it("expands UPC-E to the same 13 digits as its UPC-A", () => {
    expect(normalizeBarcode("04252614", "upc_e")).toBe("0042100005264");
    expect(normalizeBarcode("042100005264")).toBe("0042100005264");
  });

  it("works out a typed UPC-E without being told the format", () => {
    // "04252614" fails the EAN-8 check digit, so it's tried as UPC-E.
    expect(hasValidCheckDigit("04252614")).toBe(false);
    expect(normalizeBarcode("04252614")).toBe("0042100005264");
  });

  it("reads a typed code that passes both checks as UPC-E, like the scanner would", () => {
    // "01234565" is valid as EAN-8 AND as UPC-E. Scanned, the camera says
    // upc_e; typed, it must come out the same, or one pack becomes two foods.
    expect(hasValidCheckDigit("01234565")).toBe(true);
    expect(normalizeBarcode("01234565")).toBe("0012345000065");
    expect(normalizeBarcode("01234565", "upc_e")).toBe("0012345000065");
  });

  it("trusts the scanner when it says EAN-8", () => {
    expect(normalizeBarcode("01234565", "ean_8")).toBe("01234565");
    expect(normalizeBarcode("04252614", "ean_8")).toBeNull(); // fails the EAN-8 check
  });

  it("ignores spaces and dashes typed from the pack", () => {
    expect(normalizeBarcode(" 5 000112 637922 ")).toBe("5000112637922");
    expect(normalizeBarcode("0-36000-29145-2")).toBe("0036000291452");
  });

  it("turns a 14-digit code with a leading 0 into 13 digits", () => {
    expect(normalizeBarcode("05000112637922")).toBe("5000112637922");
  });

  it("refuses misreads, letters and wrong lengths", () => {
    expect(normalizeBarcode("5000112637923")).toBeNull();
    expect(normalizeBarcode("abc")).toBeNull();
    expect(normalizeBarcode("")).toBeNull();
    expect(normalizeBarcode("1234567")).toBeNull();
    expect(normalizeBarcode("1234567890")).toBeNull(); // 10 digits isn't a grocery code
  });
});

describe("confirmRead", () => {
  it("accepts a code only when two reads in a row agree", () => {
    expect(confirmRead(null, "5000112637922")).toBeNull();
    expect(confirmRead("5000112637922", "5000112637922")).toBe("5000112637922");
    expect(confirmRead("5000112637922", "3017620422003")).toBeNull();
    expect(confirmRead(null, null)).toBeNull();
  });
});
