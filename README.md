# Vite-React-Express #

Proof-of-concept of a Vite React site served by an Express Backend.

This `backend/` directory contains the following files:

```md
├── This `README.md` file
│
├── LICENSE
│
├── .env               (which you should create yourself)
├── .git
├── .gitignore
│
├── node_modules/      (will be created when you run `npm i`)
│
├── controllers
│   ├── index.js
│   └── ping.js
│
├── middleware
│   ├── index.js
│   ├── jwToken.js
│   └── serveCookie.js
│
├── public             (populated by `npm run publish`)
│   ├── assets
│   │   ├── index-CqwqLku9.js
│   │   └── index-DJaG3xuZ.css
│   ├── index.html
│   └── vite.svg
│
├── router.js
├── server.js
│
├── package-lock.json
└── package.json
```

## HOUSEKEEPING

**During development, for simplicity, I got you to save all your scripts at the root of the `backend/` directory. Here, I have done some housekeeping. For tidiness, I have moved them into separate sub-directories. I have also used `index.js` files at the root of each sub-directory to simplify access to functions in one script from another.**

## 

During development, this `backend/` folder should be inside a parent folder containing the following contents:

```md
.
├── backend/
├── frontend/
├── package.json
└── publish.sh
```

You will create your React frontend in the `frontend/` folder, and then run `npm run publish` to copy the static files produces by `vite build` into the `backend/public/` folder.

When you deploy your site, you will need to:
1. Create a Git repository in this `backend/` directory
2. Ensure that the `public/` folder contains the latest files
3. Commit your changes
4. Push to a remote repository on GitHub
5. Create a Web Service on Render.com
6. Connect your Web Service to your GitHub repository
7. Enter your custom `.env` variables
8. Start the Web Service.