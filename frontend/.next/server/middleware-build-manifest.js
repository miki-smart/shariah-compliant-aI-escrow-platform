self.__BUILD_MANIFEST = {
  "polyfillFiles": [
    "static/chunks/polyfills.js"
  ],
  "devFiles": [
    "static/chunks/react-refresh.js"
  ],
  "ampDevFiles": [],
  "lowPriorityFiles": [],
  "rootMainFiles": [],
  "pages": {
    "/_app": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_app.js"
    ],
    "/_error": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_error.js"
    ],
    "/buyer": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/buyer.js"
    ],
    "/delivery": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/delivery.js"
    ],
    "/login": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/login.js"
    ],
    "/register": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/register.js"
    ],
    "/register/success": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/register/success.js"
    ]
  },
  "ampFirstPages": []
};
self.__BUILD_MANIFEST.lowPriorityFiles = [
"/static/" + process.env.__NEXT_BUILD_ID + "/_buildManifest.js",
,"/static/" + process.env.__NEXT_BUILD_ID + "/_ssgManifest.js",

];