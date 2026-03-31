# Training Picker

A simple mobile-friendly web app for building a list of trainings and randomly choosing one for the day.

## Features

- Add as many trainings as you want
- Give each training a custom title
- Paste the full drill text for each training
- Edit or delete saved trainings
- Pick a random training with one button click
- Open the selected training in a focused pop-up reading window
- Install it on your phone home screen like an app
- Data stays saved in your browser with `localStorage`

## Run locally

### Option 1: Open directly

Open `index.html` in your browser.

### Option 2: Run a simple local server

If you have Python installed:

```powershell
cd "c:\Users\avive\Documents\Ofri\GIT Hub\Training-App"
py -m http.server 8000
```

Then open `http://127.0.0.1:8000`.

## Use it on your phone

1. Publish the project to a static host such as **GitHub Pages**, **Netlify**, or **Vercel**
2. Open the hosted URL on your phone
3. Tap **Install on phone** in the app, or use your browser menu:
   - **iPhone / Safari:** Share → **Add to Home Screen**
   - **Android / Chrome:** Menu → **Install app** or **Add to Home Screen**

## Deploy with GitHub Pages

This repo is now configured with a GitHub Actions workflow for **GitHub Pages**.

### Publish steps

```powershell
git add .
git commit -m "Add Training Picker app and GitHub Pages deploy"
git push origin main
```

Then in GitHub:

1. Open **Settings** → **Pages**
2. Under **Build and deployment**, choose **Source: GitHub Actions**
3. Wait for the workflow to finish
4. Your app will be available at:
   - `https://ezaviv.github.io/Training-App/`

## Deploy online later

Because this app is fully static, you can also host it easily on:

- GitHub Pages
- Netlify
- Vercel

No backend is required for the current version.
