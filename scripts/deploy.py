#!/usr/bin/env python3

import os, sys
import importlib.util

self_dir = os.path.realpath(os.path.dirname(__file__))

# Do this so we can get the ConfigParser module.
cu_path = os.path.join(self_dir, "..", "back", "ConfigUtils.py")
cu_spec = importlib.util.spec_from_file_location("ConfigUtils", cu_path)
ConfigUtils = importlib.util.module_from_spec(cu_spec)
sys.modules["ConfigUtils"] = ConfigUtils
cu_spec.loader.exec_module(ConfigUtils)

################################################################################

print(f"We are running from directory {self_dir}")

print("Where do cgi-bin scripts go?")
cgibin_path = input()

if not os.path.exists(cgibin_path):
    print("That path does not exist! Please provide a valid path.")
    sys.exit(1)

print("Where should the HTML frontend go?")
html_path = input()

if not os.path.exists(html_path):
    print("That path does not exist! Please provide a valid path.")
    sys.exit(1)

################################################################################

print("Creating config files...")
with open(ConfigUtils.getConfigPath(), 'w') as config_file:
    ConfigUtils.getConfig().write(config_file)

################################################################################

back_src = os.path.normpath(os.path.join(self_dir, "..", "back"))
back_dst = os.path.normpath(os.path.join(cgibin_path, "ScheduleTool"))

print(f"Linking {back_src} -> {back_dst}")
os.symlink(back_src, back_dst)

front_src = os.path.normpath(os.path.join(self_dir, "..", "front"))
front_dst = os.path.normpath(os.path.join(html_path, "ScheduleTool"))

print(f"Linking HTML Frontend {front_src} -> {front_dst}")
os.symlink(front_src, front_dst)

################################################################################

print(f"Deployment complete. Frontend and backend are both deployed as symlinks. You should not have to run this tool again.")
print(f"Backend script has been deployed to {back_dst}")
print(f"Frontend files have been deployed to {front_dst}")

