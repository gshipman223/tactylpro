FROM gitpod/workspace-full:latest

# Extra tools (optional)
RUN sudo apt-get update && sudo apt-get install -y \
  jq curl ripgrep python3-pip python3-venv \ 
  && sudo rm -rf /var/lib/apt/lists/*

# Preferred package manager
RUN npm i -g pnpm@9
