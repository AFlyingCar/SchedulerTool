#!/usr/bin/env python3

import sqlite3
import json
import sys
import uuid
import urllib
import os
from enum import Enum, unique, auto

import ConfigUtils

ENABLE_DB = True

CALENDARS_TABLE_NAME = "calendars"
SCHEDULES_TABLE_NAME = "schedules"

ConfigUtils.init()

def getCommonHeaders() -> str:
    return '\r\n'.join([
        "Content-type:text/html",
        "Access-Control-Allow-Origin: *",
        "Access-Control-Request-Headers: Content-Type",
        "" # Make sure to have an empty one at the end so we always end with \r\n
        ])

def getHtml(body: str, status) -> str:
    status_str = ""
    if status != None:
        status_str = f"Status:{status}\r\n"

    return f"{getCommonHeaders()}{status_str}\r\n<html>{body}</html>"

def getJson(data: str, status) -> str:
    status_str = ""
    if status != None:
        status_str = f"Status:{status}\r\n"

    return f"{getCommonHeaders()}{status_str}\r\n{data}"

def returnError(status: int, reason: str):
    print(getHtml(f"{reason}", status))
    exit(0)

def returnJson(status: int, json: str):
    print(getJson(f"{json}", status))
    exit(0)

def printError(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

class DatabaseManager(object):
    def __init__(self):
        printError(f"Connecting to database at {ConfigUtils.getConfig()['General']['DBPath']}...")
        self.db = sqlite3.connect(ConfigUtils.getConfig()['General']['DBPath'])
        self.cur = self.db.cursor()
        printError("Done")

    def sanitizeStr(self, string):
        return '"' + string + '"'

    def execQuery(self, query, parameters = None):
        printError(f"EXEC: '{query}'")
        if parameters:
            printError(f"PARAM: '{', '.join(parameters)}'")

        if not ENABLE_DB:
            printError("DB NOT ENABLED.")
            return

        if parameters is not None:
            self.cur.execute(query, parameters)
        else:
            self.cur.execute(query)

    def genParamSubstString(self, num_params:int):
        return ",".join((num_params * "? ").strip().split(" "))

    def createTable(self, table_name, columns):
        # columns = [(NAME, TYPE, PRIMARY|FOREIGN|''), ...]
        columns_params = [f"{c[0]} {c[1]} {c[2] + (' KEY' if c[2] else '')}" for c in columns]
        self.execQuery(f'CREATE TABLE IF NOT EXISTS {self.sanitizeStr(table_name)} ({",".join(columns_params)})')
        self.save()

    def insert(self, table_name, row):
        self.execQuery(f'INSERT INTO {self.sanitizeStr(table_name)} VALUES ({self.genParamSubstString(len(row))})', row)
        self.save()

    def buildConditionString(self, conditions = []):
        # conditions = {column_name=expected}
        if conditions:
            return "WHERE " + ' AND '.join([f'{name} = {self.sanitizeStr(expected)}' for name,expected in conditions])

        return ""

    def buildSetString(self, updates = {}):
        # updates = {column_name=value}
        if updates:
            return "SET " + ', '.join([f'{name} = {self.sanitizeStr(expected)}' for name,value in updates])

        return ""

    def getColumn(self, table_name, column_name, conditions):
        self.execQuery(f'SELECT {column_name} FROM {self.sanitizeStr(table_name)} {self.buildConditionString(conditions)}')
        return self.cur.fetchall()

    def get(self, table_name, conditions = []):
        self.execQuery(f'SELECT * FROM {self.sanitizeStr(table_name)} {self.buildConditionString(conditions)}')
        return self.cur.fetchall()

    def update(self, table_name, conditions, updates = {}):
        self.execQuery(f'UPDATE {self.sanitizeStr(table_name)} SET {self.buildSetString(updates)} WHERE {self.buildConditionString(conditions)}')

    def save(self):
        self.db.commit()

@unique
class Operations(Enum):
    CREATE_CAL = auto()
    CREATE_SCH = auto()
    EDIT_CAL = auto()
    EDIT_SCH = auto()
    LIST_CAL = auto()
    LIST_SCH = auto()
    GET_CAL = auto()
    GET_SCH = auto()

    @classmethod
    def getDBManager(cls):
        if 'db_manager' not in cls.__dict__:
            cls.db_manager = DatabaseManager()

        return cls.db_manager

    def run(self, data: str):
        printError(f"Running operation '{self.name}'")

        if self == Operations.CREATE_CAL:
            self.createCalendar(data)
        elif self == Operations.CREATE_SCH:
            self.createSchedule(data)
        elif self == Operations.EDIT_CAL:
            self.editCalendar(data)
        elif self == Operations.EDIT_SCH:
            self.editSchedule(data)
        elif self == Operations.LIST_CAL:
            self.listCalendars(data)
        elif self == Operations.LIST_SCH:
            self.listSchedules(data)
        elif self == Operations.GET_CAL:
            self.getCalendar(data)
        elif self == Operations.GET_SCH:
            self.getSchedule(data)
        else:
            returnError(501, f"<p>Invalid Operation '{self.name}'</p>")

    def createCalendarsTable(self):
        columns = [("UUID", "TEXT", "PRIMARY"), ("Name", "TEXT NOT NULL", '')]
        self.getDBManager().createTable(CALENDARS_TABLE_NAME, columns)

    def createSchedulesTable(self):
        columns = [("UUID", "TEXT", "PRIMARY"), ("Calendar_UUID", "TEXT", ""), ("Name", "TEXT NOT NULL", ''), ("Schedule", "BLOB NOT NULL", '')]
        self.getDBManager().createTable(SCHEDULES_TABLE_NAME, columns)

    def createCalendar(self, data):
        # Expected: { 'name': ... }
        # Returns: { 'uuid': ..., 'name': ... }

        cal_uuid = str(uuid.uuid4())

        cal_name = ''
        if 'name' not in data:
            returnError(400, f"{self.name} requires input field 'name'")

        cal_name = data['name']

        printError(f"Creating calendar named '{cal_name}' with UUID={cal_uuid}")
        self.createCalendarsTable()
        self.getDBManager().insert(CALENDARS_TABLE_NAME, [cal_uuid, cal_name])

        returnJson(200, json.dumps({'uuid':cal_uuid, 'name':cal_name}))

    def getCalendarUUID(self, data):
        if 'cal_uuid' in data:
            return data['cal_uuid']
        elif 'cal_name' in data:
            cal_name = data['cal_name']
            calendars = self.getDBManager().get(CALENDARS_TABLE_NAME, [('Name', cal_name)])
            if len(calendars) == 0:
                returnError(400, f"<p>No calendars found with name {cal_name}</p>")
            elif len(calendars) > 1:
                printError(f"Multiple calendars found with name {cal_name}")
                returnJson(300, json.dumps([{'uuid': r[0], 'name': r[1]} for r in calendars]))
            else:
                return calendars[0][0]
        else:
            returnError(400, f"<p>{self.name} requires input either field 'cal_uuid' or 'cal_name'</p>")

    def createSchedule(self, data):
        # Expected: { 'cal_uuid': ..., 'name': ... } OR
        #           { 'cal_name': ..., 'name': ... }
        # Returns: { 'uuid': ..., 'cal_uuid': ..., 'name': ..., 'schedule': "" }

        sch_name = ''
        if 'name' not in data:
            returnError(400, f"{self.name} requires input field 'name'")
        sch_name = data['name']

        cal_uuid = self.getCalendarUUID(data)

        sch_uuid = str(uuid.uuid4())

        printError("Creating a schedule for calendar {cal_uuid}")
        self.createSchedulesTable()
        self.getDBManager().insert(SCHEDULES_TABLE_NAME, [sch_uuid, cal_uuid, sch_name, ""])

        returnJson(200, json.dumps({'uuid': sch_uuid, 'cal_uuid': cal_uuid, 'name': sch_name, 'schedule': ""}))

    def editCalendar(self, data):
        # Expected: { 'uuid': ..., 'updates': { ... } }

        self.createCalendarsTable()

        cal_uuid = ''
        if 'uuid' not in data:
            returnError(400, f"{self.name} requires input field 'uuid'")
        cal_uuid = data['uuid']

        updates = data['updates']

        # Only update if there actually _was_ any data provided to update
        if updates:
            printError(f"Updating the following columns for calendar '{cal_uuid}': {updates}")
            self.getDBManager().update(CALENDARS_TABLE_NAME, [('UUID', cal_uuid)], updates)

        returnJson(200, json.dumps({'uuid': cal_uuid, **updates}))

    def editSchedule(self, data):
        # Expected: { 'uuid': ..., 'updates': { ... } }
        # Returns: { 'uuid': ..., 'cal_uuid': ..., 'name': ..., 'schedule': ... }

        self.createSchedulesTable()

        sch_uuid = ''
        if 'uuid' in data:
            sch_uuid = data['uuid']
        else:
            returnError(400, f"{self.name} requires input field 'uuid' or input field 'name'")

        updates = data['updates']

        if updates:
            printError(f"Updating the following columns for schedule '{sch_uuid}': {updates}")
            self.getDBManager().update(SCHEDULES_TABLE_NAME, [('UUID', sch_uuid)], updates)

        returnJson(200, json.dumps({'uuid': sch_uuid, 'cal_uuid': cal_uuid, 'name': sch_name, 'schedule': ""}))

    def listCalendars(self, data):
        # Expected: { }
        # Returns: [ { 'uuid': ..., 'name': ... }, ... ]

        self.createCalendarsTable()

        printError(f"Getting all calendars")

        results = self.getDBManager().get(CALENDARS_TABLE_NAME)

        dresult = []
        for result in results:
            dresult.append({'uuid': result[0], 'name': result[1]})

        returnJson(200, json.dumps(dresult))

    def listSchedules(self, data):
        # Expected: { 'cal_uuid': ... } OR
        #           { 'cal_name': ... }
        # Returns: [ { 'uuid': ..., 'cal_uuid': ..., 'name': ..., 'schedule': ... }, ... ]

        self.createSchedulesTable()

        cal_uuid = self.getCalendarUUID(data)

        results = self.getDBManager().get(SCHEDULES_TABLE_NAME, [('Calendar_UUID', cal_uuid)])

        dresult = []
        for result in results:
            dresult.append({'uuid': result[0], 'cal_uuid': result[1], 'name': result[2], 'schedule': result[3]})

        returnJson(200, json.dumps(dresult))

    def getCalendar(self, data):
        # Expected: { 'cal_uuid': ... } OR
        #           { 'cal_name': ... }
        # Returns: { 'uuid': ..., 'name': ... }

        self.createCalendarsTable()

        cal_uuid = self.getCalendarUUID(data)

        results = self.getDBManager().get(CALENDARS_TABLE_NAME, [('UUID', cal_uuid)])

        returnJson(200, json.dumps({'uuid': results[0][0], 'name': results[0][1]}))

    def getSchedule(self, data):
        # Expected: { 'uuid': ..., }
        # Returns: { 'uuid': ..., 'cal_uuid': ..., 'name': ..., 'schedule': ... }
 
        self.createSchedulesTable()

        sch_uuid = ''
        if 'uuid' in data:
            sch_uuid = data['uuid']
        else:
            returnError(400, f"{self.name} requires input field 'uuid' or input field 'name'")

        results = self.getDBManager().get(SCHEDULES_TABLE_NAME, [('UUID', sch_uuid)])

        returnJson(200, json.dumps({'uuid': results[0][0], 'cal_uuid': results[0][1], 'name': results[0][2], 'schedule': results[0][3]}))

def main():
    op_type = None

    if len(sys.argv) > 1:
        op_type = sys.argv[1]
    else:
        query = urllib.parse.parse_qs(os.environ['QUERY_STRING'])

        if not 'operation' in query:
            printError(f"Missing 'operation' in query. Received query was '{os.environ['QUERY_STRING']}'")
            op_type = None
        else:
            op_type = query['operation'][0]

    if not op_type:
        returnError(400, "<p>No operation type provided.</p>")

    data = sys.stdin.read()
    if not data:
        # Receiving no POST data is not necessarily an error.
        data = "{}"
    jdata = json.loads(data)

    printError(f"Received data = {data}")

    if op_type not in Operations.__members__:
        returnError(405, f"<p>Invalid operation type {op_type}</p>")

    operation = Operations[op_type]

    operation.run(jdata)

    # Just in case the operation didn't complete on its own, make sure we return
    #  here
    returnError(200, "")

if __name__ == '__main__':
    main()

