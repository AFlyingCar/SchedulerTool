
import configparser

def getConfigPath():
    return "/etc/ScheduleTool.ini"

################################################################################
# Create private config object

# You should not be accessing this variable outside of accessors for this file
_config = configparser.ConfigParser()

################################################################################
# Public utility functions

def getConfig():
    return _config

def setConfigsToDefault():
    _config["General"] = {
        'DBPath': '/var/lib/ScheduleTool/schedule_tool.db'
    }

def readConfigsFromFile(path):
    _config.read(path)

def init():
    readConfigsFromFile(getConfigPath())

################################################################################
# Lastly, default everything and then load the config file

setConfigsToDefault()

