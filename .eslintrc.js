module.exports = {
    "extends": "airbnb-base",
    "rules": {
      "no-unused-vars": ["warn", { vars: "local", args: "after-used", ignoreRestSiblings: true }],
    },
    "plugins": [
        "import"
    ]
};
