const fs = require("fs");
const pdfModule = require("pdf-parse");
const logger = require("./logger");

/**
 * Parses a binary PDF file and extracts its plain text contents
 * Supports both legacy/standard functional signatures and modern class-based signatures of pdf-parse.
 * @param {string} filePath - Absolute path to the PDF file
 * @returns {Promise<string>} Extracted plain text
 */
const parsePDF = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Resume file not found at path: ${filePath}`);
    }

    const dataBuffer = fs.readFileSync(filePath);
    let text = "";
    let pageCount = 1;

    // Check if pdfModule itself is the constructor class (from pdf-parse v2)
    if (pdfModule && pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: dataBuffer });
      try {
        const textResult = await parser.getText();
        text = textResult.text || "";
        pageCount = textResult.total || 1;
      } finally {
        if (typeof parser.destroy === "function") {
          await parser.destroy().catch(() => {});
        }
      }
    }
    // Check if pdfModule has a default export containing the PDFParse class
    else if (pdfModule && pdfModule.default && pdfModule.default.PDFParse) {
      const parser = new pdfModule.default.PDFParse({ data: dataBuffer });
      try {
        const textResult = await parser.getText();
        text = textResult.text || "";
        pageCount = textResult.total || 1;
      } finally {
        if (typeof parser.destroy === "function") {
          await parser.destroy().catch(() => {});
        }
      }
    }
    // Check if pdfModule is a direct function (legacy/standard pdf-parse)
    else if (typeof pdfModule === "function") {
      const data = await pdfModule(dataBuffer);
      text = data.text || "";
      pageCount = data.numpages || 1;
    }
    // Check if pdfModule has a default export that is a function
    else if (pdfModule && pdfModule.default && typeof pdfModule.default === "function") {
      const data = await pdfModule.default(dataBuffer);
      text = data.text || "";
      pageCount = data.numpages || 1;
    }
    // Fallback: try directly invoking pdfModule as a function, then fallback to instantiating it
    else {
      try {
        const data = await pdfModule(dataBuffer);
        text = data.text || "";
        pageCount = data.numpages || 1;
      } catch (err1) {
        try {
          const parser = new pdfModule({ data: dataBuffer });
          try {
            const textResult = await parser.getText();
            text = textResult.text || "";
            pageCount = textResult.total || 1;
          } finally {
            if (typeof parser.destroy === "function") {
              await parser.destroy().catch(() => {});
            }
          }
        } catch (err2) {
          throw new Error("No compatible pdf-parse export or constructor found");
        }
      }
    }

    // Clean and normalize the extracted text
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\n+/g, "\n")
      .trim();

    logger.info("PDF resume parsed successfully", {
      filePath,
      charactersExtracted: text.length,
      pageCount
    });

    return text;
  } catch (error) {
    logger.error("Error parsing PDF resume contents", {
      filePath,
      error: error.message
    });
    throw new Error(`Failed to extract text from PDF resume: ${error.message}`);
  }
};

module.exports = {
  parsePDF
};
