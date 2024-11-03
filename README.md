# wmcyn online 🌐

this is the official repository for the wmcyn online, built using next.js and typescript.

## overview 🚀

the wmcyn online website is a modern web application developed to showcase wmcyn's diverse offerings, including but not limited to future events, an online store, our xr experiences, and more. built with next.js and typescript, the website is optimized for scalability, performance, seo, and ease of maintenance.

## tech stack 🛠️

- **framework**: [next.js](https://nextjs.org/)
- **language**: [typescript](https://www.typescriptlang.org/)
- **styling**: css modules / scss
- **backend**: firebase (realtime database)
- **deployment**: github pages & squarespace domains

## features 💡

- **static and server-side rendering**: utilizing next.js to render pages both statically and server-side for optimal performance.
- **type safety**: leveraging typescript to ensure type safety throughout the application.
- **firebase integration**: includes a backend setup with firebase for user authentication, realtime database storage, and more.

## prerequisites 📋

make sure you have the following installed:

- [node.js](https://nodejs.org/) (v14 or later)
- [yarn](https://yarnpkg.com/)

## getting started 🏁

1. **clone the repository**

   ```bash
   git clone https://github.com/your-username/wmcyn-online.git
   cd wmcyn-online
   ```

2. **install dependencies**

   using yarn:

   ```bash
   yarn install
   ```

3. **set up environment variables**

   create a `.env.local` file in the root directory and add your environment variables. refer to `.env.example` for the required variables.

4. **run the development server**

   ```bash
   yarn dev
   ```

   the website should now be available at [http://localhost:3000](http://localhost:3000).

## scripts 🎮

- `yarn dev` - runs the development server.
- `yarn build` - builds the application for production.
- `yarn deploy` - deploys the application to github pages.
- `yarn lint` - runs eslint to analyze the code for potential errors.
- `yarn preview` - previews the production build.

## project structure 🗂️

- `/pages` - contains all the pages for the website.
- `/components` - reusable ui components used across the website.
- `/styles` - contains global and modular stylesheets.
- `/utils` - utility functions and helpers.
- `/public` - static assets like images, icons, etc.

## deployment 🚀

the website is deployed using [github pages](https://pages.github.com/) and utilizes [squarespace domains](https://www.squarespace.com/domains) for domain management. to deploy your own version:

1. push the code to your github repository.
2. configure github pages in your repository settings.
3. set up environment variables if needed.
4. build first and then deploy using the following script:

   ```bash
   yarn build
   yarn deploy
   ```

    this script builds the application and starts the deploy process in github actions which is configured to deploy the dist directory to github pages.

## contributing 🤝🏽

contributions are welcome! if you'd like to contribute, please open an issue or submit a pull request.

## license 📜

this project is licensed under the mit license.
