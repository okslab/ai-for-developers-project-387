const baseUrl = process.env.APP_URL ?? "https://ai-for-developers-project-387-production-79d9.up.railway.app";

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      url: [
        `${baseUrl}/`,
        `${baseUrl}/owner`,
        `${baseUrl}/owner/bookings`,
      ],
      settings: {
        chromeFlags: "--no-sandbox --disable-gpu",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./reports",
      reportFilenamePattern: "%%HOSTNAME%%-%%PATHNAME%%-%%DATETIME%%.report.%%EXTENSION%%",
    },
  },
};