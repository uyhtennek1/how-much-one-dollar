/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./node_modules/flowbite/**/*.js",
    "./popup/*.{html,js}"
  ],
  plugins: [
    require('flowbite/plugin')
  ]
}
