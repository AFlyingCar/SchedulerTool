
////////////////////////////////////////////////////////////////////////////////
// Configuration

////////////////////////////////////////////////////////////////////////////////
// IMPORTANT NOTE: SET THIS VALUE TO THE URL LOCATION OF WHERE TO FIND
//                 ScheduleTool.py.
//                 FAILURE TO DO SO WILL CAUSE ALL PAGES TO FAIL TO LOAD
//                 CALENDAR AND SCHEDULE DATA
////////////////////////////////////////////////////////////////////////////////
var schedule_tool_path = ''

////////////////////////////////////////////////////////////////////////////////
// Constants

// All days on the schedule/calendar
const DAY_NAMES = [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" ];

// The number of time blocks on the schedule/calendar
const NUM_BLOCKS = 24;

////////////////////////////////////////////////////////////////////////////////
// Calendar Generation Functions

function genCalendarHeader(header_row, header_onclick) {
    header_row.insertCell(); // Empty cell for the time column
    for(let i = 0; i < DAY_NAMES.length; ++i) {
        const td = header_row.insertCell();
        td.appendChild(document.createTextNode(DAY_NAMES[i]));
        td.onclick = function() {
            header_onclick(0, i)
        }
        // td.style.border = '1px solid black';
    }
}

// Generic calendar generation function.
//  div_name = where to put the calendar
//  cell_callback = optional callback function to generate the node for a particular
//    cell. Takes indices (i,j). 1-based
//  header_callback = optional function assigned as the on-click for the header
//    row/column. Takes 0/1 for header row/column, index for which row/column
function genCalendar(div_name, cell_callback, header_onclick) {
    console.log('genCalendar(' + div_name + ')');
    const table_div = document.querySelector("div#" + div_name);

    const table = document.createElement('table');

    // Set up the header row first
    const header_row = table.insertRow();
    genCalendarHeader(header_row, header_onclick);

    // half-hour increments
    for(let i = 0; i < NUM_BLOCKS; ++i) {
        // The next row
        const tr = table.insertRow();
        const time_cell = tr.insertCell();
        // TODO: Do we want to support half-hour increments?
        // time_cell.appendChild(document.createTextNode( ((i % 2) == 0 ? ('' + (i/2) + ':00') : ('' + (i - 1) + ':30')) ))

        time_cell.appendChild(document.createTextNode(i + ':00'))
        time_cell.onclick = function() {
            header_onclick(1, i)
        }

        for(let j = 0; j < DAY_NAMES.length; ++j) {
            const td = tr.insertCell();
            if(!!cell_callback) {
                var node = cell_callback(i, j)
            } else {
                var node = document.createTextNode('TODO')
            }
            td.appendChild(node);
            td.style.border = '1px solid black';
        }
    }

    table_div.append(table)
}

function genViewCalendar(div_name) {
    if(!hasQuery('uuid')) {
        console.log("Missing required option 'uuid'")
        return
    }

    var calendar_uuid = getQuery('uuid')

    const options = {
        method: 'POST',
        body: JSON.stringify({ cal_uuid: calendar_uuid }),
        headers: {
            // 'Content-Type': 'application/json'
        }
    }

    // Get calendar information
    fetch(schedule_tool_path + '?operation=GET_CAL', options)
        .then(res => res.json())
        .then(function(json) {
            console.log('genViewCalendar[PROPERTIES](' + div_name + ')');

            // Set the calendar name based on the response from the server
            const form_cal_name = document.querySelector("#cname");

            form_cal_name.value = json['name']
        }).catch(ex => console.log("Failed to parse response from ScheduleTool: ", ex));

    genCalendar(div_name, function(time, day) {
        return document.createTextNode('TODO')
    })
}

// CreateSchedule calendar generation function
function genCreateScheduleCalendar(div_name) {
    genCalendar(div_name, function(time, day) {
        var new_node = document.createElement('select')

        var available_opt = document.createElement('option')
        available_opt.value = 'Available'
        available_opt.appendChild(document.createTextNode('Available'))

        var unavailable_opt = document.createElement('option')
        unavailable_opt.appendChild(document.createTextNode('Un-Available'))

        var tentative_opt = document.createElement('option')
        tentative_opt.appendChild(document.createTextNode('Tentative'))

        new_node.append(available_opt)
        new_node.append(unavailable_opt)
        new_node.append(tentative_opt)

        // Change the background-color
        new_node.onchange = function() {
            var index = new_node.selectedIndex
            switch(index) {
                case 0:
                    new_node.style.backgroundColor = 'green'
                    break
                case 1:
                    new_node.style.backgroundColor = 'red'
                    break
                case 2:
                    // TODO: Do we want to do some sort of striping here?
                    // new_node.style.backgroundColor = 'red'
                    new_node.style.backgroundColor = ''
                    break
            }
        }

        // Make sure we run the on-change function for the first time to set up
        //   the correct style for this node
        new_node.onchange()

        return new_node
    },
    function (row_v_col, index) {
        console.log('click on ' + row_v_col + '@index=' + index)
        // TODO
    })
}

function genEditScheduleCalendar(div_name) {
    // First create the calendar itself in its default state
    genCreateScheduleCalendar(div_name)

    // TODO: Download the schedule we want to look at, and adjust the properties
    //   for it
}

function genCalendarsList(div_name) {
    const options = {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
        }
    }

    fetch(schedule_tool_path + '?operation=LIST_CAL', options)
        .then(res => res.json())
        .then(function(json) {
            console.log('genCalendarsList(' + div_name + ')');
            const table_div = document.querySelector("div#" + div_name);

            json.forEach(function(v, i) {
                console.log("Received calendar '" + JSON.stringify(v) + "'")
                const calendar_link = document.createElement('a')

                // Use './' to do a relative link from here
                calendar_link.href = './CalendarView.html?uuid=' + v["uuid"]
                calendar_link.appendChild(document.createTextNode(v["name"]))

                table_div.appendChild(calendar_link)
            })
        }).catch(ex => console.log("Failed to parse response from ScheduleTool: ", ex));
}

function genSchedulesList(div_name, shared_uuids) {
    if(!hasQuery('uuid')) {
        console.log("Missing required option 'uuid'")
        return
    }

    var calendar_uuid = getQuery('uuid')

    const options = {
        method: 'POST',
        body: JSON.stringify({ cal_uuid: calendar_uuid }),
        headers: {
        }
    }

    fetch(schedule_tool_path + '?operation=LIST_SCH', options)
        .then(res => res.json())
        .then(function(json) {
            console.log('getSchedulesList')

            json.forEach(function(v, i) {
                console.log("Received schedule '" + JSON.stringify(v) + "'")

                const getsch_options = {
                    method: 'POST',
                    body: JSON.stringify({ uuid: v["uuid"] }),
                    headers: { }
                }
                console.log("Fetching schedule data.")
                var schedule_data;
                fetch(schedule_tool_path + '?operation=GET_SCH', getsch_options)
                    .then(res => res.json())
                    .then(function(sch_json) {
                        schedule_data = sch_json.schedule
                    }).catch(ex => console.log("Failed to parse response from ScheduleTool: ", ex));

                const schedules_list_div = document.querySelector("div#" + div_name);

                // Container for holding the link to the schedule and the toggle check-box
                const schedule_div = document.createElement('div')

                // Create link to the schedule
                const schedule_link = document.createElement('a')

                // Use './' to do a relative link from here
                schedule_link.href = './ScheduleView.html?uuid=' + v["uuid"]
                schedule_link.appendChild(document.createTextNode(v["name"]))

                // Create checkbox to toggle the schedule
                const schedule_toggle = document.createElement('input')

                schedule_toggle.type = 'checkbox'
                schedule_toggle.onchange = function() {
                    // Make sure we represent the change
                    schedule_toggle.checked = !schedule_toggle.checked

                    // TODO: Change whether this schedule is displayed
                    console.log('Holding schedule data: ' + schedule_data)
                }
                schedule_toggle.onclick = function() {
                    schedule_toggle.onchange();
                }
                schedule_toggle.style.float = 'left'

                // Make sure that the toggles start being checked on if there is
                //   at least one uuid being shared
                if(shared_uuids.length == 0 || shared_uuids.find(i => (i === v["uuid"]) ))
                {
                    schedule_toggle.onchange();
                }

                schedule_div.id = v["uuid"]

                schedule_div.appendChild(schedule_link)
                schedule_div.appendChild(schedule_toggle)

                schedules_list_div.appendChild(schedule_div)
            })
        }).catch(ex => console.log("Failed to parse response from ScheduleTool: ", ex));
}

////////////////////////////////////////////////////////////////////////////////
// Request submit functions

function submitEditCalendarProperties() {
    // TODO
}

function submitCreateSchedule(table_div) {
    if(!hasQuery('uuid')) {
        console.log("Missing required option 'uuid'")
        return
    }

    var calendar_uuid = getQuery('uuid')

    const schedule_name = document.querySelector("#cname");

    const options = {
        method: 'POST',
        body: JSON.stringify({
            cal_uuid: calendar_uuid,
            name: schedule_name.value,
            schedule: getScheduleState(table_div)
        }),
        headers: {
        }
    }

    fetch(schedule_tool_path + '?operation=CREATE_SCH', options)
        .then(res => res.json())
        .then(function(json) {
            console.log('createSchedule')

            window.location.replace('./CalendarView.html?uuid=' + calendar_uuid)

        }).catch(ex => console.log("Failed to parse response from ScheduleTool: ", ex));
}

function submitEditSchedule(table_div) {
    if(!hasQuery('uuid')) {
        console.log("Missing required option 'uuid'")
        return
    }

    var schedule_uuid = getQuery('uuid')

    const schedule_name = document.querySelector("#sname");

    const options = {
        method: 'POST',
        body: JSON.stringify({
            uuid: schedule_uuid,
            updates: {
                name: schedule_name.value,
                schedule: getScheduleState(table_div)
            }
        }),
        headers: {
        }
    }

    fetch(schedule_tool_path + '?operation=EDIT_SCH', options)
        .then(res => res.json())
        .then(function(json) {
            console.log('createSchedule')
        }).catch(ex => console.log("Failed to parse response from ScheduleTool: ", ex));
}

////////////////////////////////////////////////////////////////////////////////
// Page Loader functions

function loadCalendarView(cal_div, schedule_div, create_schedule_link) {
    if(!hasQuery('uuid')) {
        console.log("Missing required option 'uuid'")
        return
    }

    var calendar_uuid = getQuery('uuid')

    // If 'share' is provided, decode the base64 value and only enable the
    //   schedules that are specified internally
    var shared_uuids = []
    if(hasQuery('share')) {
        const share_b64 = getQuery('share')
        var share_string = atob(share_b64)

        shared_uuids = share_string.split(",")
    }

    genViewCalendar(cal_div);
    genSchedulesList(schedule_div, shared_uuids)

    // Make sure that we adjust the height of the schedules list so that it lines
    //   up with the calendar's height
    const cal_table_div = document.querySelector("div#" + cal_div);
    const schedules_list_div = document.querySelector("div#" + schedule_div);
    schedules_list_div.style.height = cal_table_div.clientHeight;

    // Make sure that the create schedule element can also point at the right page
    const create_schedule_element = document.querySelector("#" + create_schedule_link);
    create_schedule_element.href += "?uuid=" + calendar_uuid;

    // Add share button
    const share_button = document.createElement('input')
    share_button.type = "button"
    share_button.value = "Share"
    share_button.onclick = function() {
        var to_share = ""

        schedules_list_div.childNodes.forEach(div => {
            const schedule_a = div.childNodes[0]
            const schedule_input = div.childNodes[1]

            if(schedule_input.checked) {
                var params = new URLSearchParams(schedule_a.search)
                var schedule_uuid = params.get('uuid')

                to_share += schedule_uuid + ","
            }
        })

        // Strip off the last comma
        to_share = to_share.substr(0, to_share.length - 1)

        var to_share_encode = btoa(to_share)

        // Replace the URL in the address bar so that it can be copied
        //   TODO: Should we instead copy into the clipboard?

        // First make sure that we remove the existing share parameter if it
        //   already exists
        var share_url = function() {
            var url_search_params = new URLSearchParams(window.location.search)
            url_search_params.delete('share')

            url_search_params.append('share', to_share_encode)

            // Rebuild the URL from the window location
            return window.location.protocol + '//' + window.location.host + window.location.pathname + '?' + url_search_params
        }()

        window.history.replaceState(null, null, share_url)
    }

    schedules_list_div.parentNode.appendChild(share_button)
}

////////////////////////////////////////////////////////////////////////////////
// Utilities

// Will return an object containing the following information:
//   The value of NUM_BLOCKS
//   An array of 7 arrays of length NUM_BLOCKS
function getScheduleState(schedule_div) {
    var schedule_state = {
        num_blocks: NUM_BLOCKS, // We should store this too, in case we change
                                //  what NUM_BLOCKS is
        day_info: []
    }

    for(let j = 0; j < DAY_NAMES.length; ++j) {
        schedule_state.day_info[j] = []

        for(let i = 0; i < NUM_BLOCKS; ++i) {
            var cell = getCalendarCell(schedule_div, j + 1, i + 1);
            var cell_option = cell.childNodes[0]

            schedule_state.day_info[j][i] = cell_option.value;
        }
    }

    return schedule_state;
}

function getCalendarCell(div_name, x, y) {
    return document.querySelector("div#" + div_name).querySelector("table").rows[y].cells[x];
}

function hasQuery(query_name) {
    const params = new URLSearchParams(window.location.search)
    return params.has(query_name)
}

function getQuery(query_name) {
    const params = new URLSearchParams(window.location.search)
    return params.get(query_name)
}

