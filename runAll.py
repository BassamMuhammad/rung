import subprocess
import os
import threading

cmd = "npm run dev"


def run_frontend():
    subprocess.Popen(f"cd ./frontend && {cmd}", shell=True)


def run_backend(dir):
    if not os.path.isdir(dir):
        return
    print(dir)
    subprocess.Popen(f"cd {dir} && {cmd}", shell=True)


threading.Thread(target=run_frontend).run()
for dir in os.listdir("./backend"):
    threading.Thread(target=run_backend, args=(f"./backend/{dir}",)).run()
