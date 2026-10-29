# Pushing this project to GitHub (and updating it later)

Netlify redeploys the site every time you push to GitHub.

## First time (GitHub Desktop, no commands)
1. Create a free account at github.com, then **New repository**: name `lead-vest-foundation`, **Private**, leave "Add a README" unticked.
2. Install GitHub Desktop (desktop.github.com) and sign in.
3. Unzip the project. In GitHub Desktop: **File > Add local repository**, choose the `lead-vest-foundation` folder. If it says "not a Git repository", click **create a repository** and accept the defaults.
4. Type a summary like `first version`, click **Commit to main**, then **Publish repository** (keep "Keep this code private" ticked).

## First time (terminal)
```
cd lead-vest-foundation
git init -b main
git add .
git commit -m "first version"
git remote add origin https://github.com/YOUR-NAME/lead-vest-foundation.git
git push -u origin main
```
GitHub asks you to sign in. If it asks for a password, use a Personal Access Token (GitHub > Settings > Developer settings > Tokens), not your account password.

## Sending a new version (for example after unzipping an updated zip)
Copy the new files over the project folder (replace all, but keep the hidden `.git` folder), then:
- GitHub Desktop: write a summary, **Commit to main**, **Push origin**.
- Terminal: `git add .` then `git commit -m "update"` then `git push`.

## Never commit secrets
`.env` files are already ignored. Passwords, `DATABASE_URL`, `SESSION_SECRET` and Google keys go only into Netlify > Environment variables.
