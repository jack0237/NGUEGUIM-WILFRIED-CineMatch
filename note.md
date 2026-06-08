GitHub ferme automatiquement une issue si le message de commit contient un mot-clé suivi du numéro. Les mots-clés acceptés :


closes #N
fixes #N
resolves #N
Exemple concret pour l'issue #3

git add .env.example .gitignore ROADMAP.md README.md
git commit -m "closes #3 - configure environment variables (.env.example + .gitignore)"
git push
GitHub fermera automatiquement l'issue #3 dès que ce commit atterrit sur la branche main.

Règles importantes
Plusieurs issues en un seul commit :


git commit -m "closes #1, closes #31 - setup project architecture and theme tokens"
Sur une branche feature (pas main) :
Le mot-clé ne ferme l'issue qu'au moment du merge dans main, pas au push. C'est le comportement recommandé si tu travailles avec des branches.


git commit -m "closes #N - description courte de ce qui a été fait"