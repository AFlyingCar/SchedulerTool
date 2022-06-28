
////////////////////////////////////////////////////////////////////////////////
// Calendar Generation Functions

var schedule_tool_path = ''

var day_names = [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" ];

function genCalendarHeader(header_row, header_onclick) {
    header_row.insertCell(); // Empty cell for the time column
    for(let i = 0; i < day_names.length; ++i) {
        const td = header_row.insertCell();
        td.appendChild(document.createTextNode(day_names[i]));
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
    for(let i = 0; i < 24; ++i) {
        // The next row
        const tr = table.insertRow();
        const time_cell = tr.insertCell();
        // TODO: Do we want to support half-hour increments?
        // time_cell.appendChild(document.createTextNode( ((i % 2) == 0 ? ('' + (i/2) + ':00') : ('' + (i - 1) + ':30')) ))

        time_cell.appendChild(document.createTextNode(i + ':00'))
        time_cell.onclick = function() {
            header_onclick(1, i)
        }

        for(let j = 0; j < day_names.length; ++j) {
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

    // TODO: Get schedule information for every schedule in the calendar

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
            'Content-Type': 'application/json'
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

////////////////////////////////////////////////////////////////////////////////
// Request submit functions

function submitEditCalendarProperties() {
    // TODO
}

////////////////////////////////////////////////////////////////////////////////

function genForScheduleList(calendar_uuid, schedule_callback) {
    const params = {
        uuid: calendar_uuid
    };

    fetch('../cgi-bin/ScheduleTool.py?operation=GET_SCH', params)
        .then(res => res.json())
        .then(function(json) {
            json.map((schedule) => {
                schedule_callback(schedule);
            });
        }).catch(ex => console.log("Failed to parse response from ScheduleTool: ", ex));
}

////////////////////////////////////////////////////////////////////////////////
// Utilities

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

