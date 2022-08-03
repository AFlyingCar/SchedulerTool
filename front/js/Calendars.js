
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
function genCalendar(div_name, cell_callback, header_onclick, create_table_callback)
{
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

    if(create_table_callback !== undefined) {
        create_table_callback(table)
    }
}

function genViewCalendar(div_name, schedules_promise) {
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

    schedules_promise.then(function(schedules) {
        genCalendar(div_name, function(time, day) {
            const cell_div = document.createElement('div')
            // ID = calcell_{TIME}_{DAY}
            cell_div.id = "calcell_" + time + "_" + day;

            schedules.forEach(function(schedule, i) {
                const sch_uuid = schedule.uuid;
                const sch_schedule = schedule.schedule;
                const sch_day_info = sch_schedule.day_info;

                const sch_color_picker = document.getElementById('S' + sch_uuid + '_color')

                const sch_color_div = document.createElement('div')

                // ID = schnode_{UUID}_{TIME}_{DAY}
                sch_color_div.id = "schnode_" + sch_uuid + "_" + time + "_" + day;
                sch_color_div.style.backgroundColor = sch_color_picker.value

                sch_color_div.appendChild(document.createTextNode(sch_day_info[day][time]))

                cell_div.appendChild(sch_color_div)
            })

            return cell_div;
        })

        // Run each onchange now so that we ensure that the colors are up to date
        schedules.forEach(function(schedule, i) {
            const sch_color_picker = document.getElementById('S' + schedule.uuid + '_color')
            sch_color_picker.onchange()
        })

        return schedules
    })
}

// CreateSchedule calendar generation function
function genCreateScheduleCalendar(div_name) {
    const cell_callback = function(time, day, onchange_callback) {
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

            onchange_callback(new_node)
        }

        // Make sure we run the on-change function for the first time to set up
        //   the correct style for this node
        new_node.onchange()

        return new_node
    }

    genCalendar(div_name, function(time, day) {
        return cell_callback(time, day, function(n) { })
    },
    function (row_v_col, index) {
        console.log('click on ' + row_v_col + '@index=' + index)
        // TODO
    },
    function(table) {
        // NOTE: CHANGE THESE IF ANY SPECIAL ROWS/COLUMNS ARE ADDED/REMOVED
        const SETALL_ROW_OFFSET = NUM_BLOCKS + 2
        const SETALL_COLUMN_OFFSET = DAY_NAMES.length + 2

        // Called after creating the table
        table.insertRow().insertCell().appendChild(document.createElement('br')) // Insert a blank row for spacing
        const tr = table.insertRow()
        const tr2 = table.insertRow()

        const header_cell = tr.insertCell();
        header_cell.appendChild(document.createTextNode('Set All'))

        // Create a special cell at the bottom of each column to set all values
        //  in that column
        for(let j = 0; j < DAY_NAMES.length; ++j) {
            const td = tr.insertCell();
            var node = cell_callback(0, j, function(node) {
                for(let i = 0; i < NUM_BLOCKS; ++i) {
                    var col_cell = getCalendarCell(div_name, j + 1, i + 1)
                    col_cell.childNodes[0].value = node.value
                    col_cell.childNodes[0].onchange()
                }
            })
            td.appendChild(node);
            td.style.border = '1px solid black';
        }

        // Add an 'Apply' button below each 'Set All' drop-down, so that the
        //   value can be applied multiple times without needing to change what
        //   the value is
        tr2.insertCell() // Nothing goes in this cell
        for(let j = 0; j < DAY_NAMES.length; ++j) {
            const td = tr2.insertCell();
            var node = document.createElement('input')
            node.type = 'button'
            node.value = 'Re-Apply'
            node.onclick = function() {
                getCalendarCell(div_name, j + 1, SETALL_ROW_OFFSET).childNodes[0].onchange()
            }
            td.appendChild(node);
        }

        // Now do the same thing again, but for rows

        // First, lets create a 'Set All' header
        const row1 = table.rows[0]
        row1.insertCell().appendChild(function() {
            const span = document.createElement('span')
            span.innerHTML='&nbsp;&nbsp;&nbsp;&nbsp;'
            return span
        }())
        row1.insertCell().appendChild(document.createTextNode('Set All'))

        // Now, create a 'Set All' cell for each row
        for(let i = 0; i < NUM_BLOCKS; ++i) {
            const row = table.rows[i + 1]
            row.insertCell().appendChild(function() {
                const span = document.createElement('span')
                span.innerHTML='&nbsp;&nbsp;&nbsp;&nbsp;'
                return span
            }())
            var node = cell_callback(i, 0, function(node) {
                for(let j = 0; j < DAY_NAMES.length; ++j) {
                    var col_cell = getCalendarCell(div_name, j + 1, i + 1)
                    col_cell.childNodes[0].value = node.value
                    col_cell.childNodes[0].onchange()
                }
            })

            const td = row.insertCell()
            td.appendChild(node);
            td.style.border = '1px solid black';

            const td2 = row.insertCell()
            var node2 = document.createElement('input')
            node2.type = 'button'
            node2.value = 'Re-Apply'
            node2.onclick = function() {
                getCalendarCell(div_name, SETALL_COLUMN_OFFSET, i + 1).childNodes[0].onchange()
            }
            td2.appendChild(node2)
        }
    })

    const reset_sch_div = document.getElementById('reset_schedule_div')
    const reset_sch_button = document.getElementById('reset_schedule_button')

    // Generate the select menu
    const reset_sch_select = cell_callback(0, 0, function(node) { })
    reset_sch_select.id = 'reset_schedule_select'

    // Generate the reset schedule button
    reset_sch_button.onclick = function() {
        let do_continue = confirm("Warning! This will reset every cell to '" + reset_sch_select.value + "'! Are you sure you want to do this?")

        if(do_continue) {
            for(let j = 0; j < DAY_NAMES.length; ++j) {
                for(let i = 0; i < NUM_BLOCKS; ++i) {
                    var cell = getCalendarCell(div_name, j + 1, i + 1);
                    var cell_option = cell.childNodes[0]

                    cell_option.value = reset_sch_select.value
                    cell_option.onchange()
                }
            }
        }
    }

    reset_sch_div.appendChild(reset_sch_select)
}

function genEditScheduleCalendar(div_name) {
    if(!hasQuery('uuid')) {
        console.log("Missing required option 'uuid'")
        return
    }
    var schedule_uuid = getQuery('uuid')

    // First create the calendar itself in its default state
    genCreateScheduleCalendar(div_name)

    // Download this schedule's data

    const getsch_options = {
        method: 'POST',
        body: JSON.stringify({ uuid: schedule_uuid }),
        headers: { }
    }
    console.log("Fetching schedule data.")
    fetch(schedule_tool_path + '?operation=GET_SCH', getsch_options)
        .then(res => res.json())
        .then(function(sch_json) {
            console.log('genEditScheduleCalendar[PROPERTIES](' + div_name + ')');

            // Set the schedule name based on the response from the server
            const form_sch_name = document.querySelector("#sname");

            form_sch_name.value = sch_json.name

            // Set the back button based on the response from the server
            const cal_uuid = sch_json.cal_uuid
            const back_link = document.querySelector('#back_link')
            back_link.href += '?uuid=' + cal_uuid

            return sch_json.schedule.replace(/'/g, '"')
        })
        .then(schedule_str => JSON.parse(schedule_str))
        .then(function(schedule) {
            // TODO: Do something with num_blocks
            const num_blocks = schedule.num_blocks
            const day_info = schedule.day_info

            // For every day
            day_info.forEach(function(day_schedule, i) {
                // For every block in the day
                day_schedule.forEach(function(block_availability, j) {
                    var cell = getCalendarCell(div_name, i + 1, j + 1);
                    var cell_option = cell.childNodes[0]

                    cell_option.value = block_availability;
                    cell_option.onchange()
                })
            })
        }).catch(ex => console.log("Failed to parse response from ScheduleTool: ", ex));
}

function genCalendarsList(div_name) {
    const options = {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
        }
    }

    return fetch(schedule_tool_path + '?operation=LIST_CAL', options)
        .then(res => res.json())
        .then(function(json) {
            console.log('genCalendarsList(' + div_name + ')');
            const table_div = document.querySelector("div#" + div_name);

            json.forEach(function(v, i) {
                console.log("Received calendar '" + JSON.stringify(v) + "'")

                const calendar_p = document.createElement('p')

                const calendar_link = document.createElement('a')

                // Use './' to do a relative link from here
                calendar_link.href = './CalendarView.html?uuid=' + v["uuid"]
                calendar_link.appendChild(document.createTextNode(v["name"]))

                calendar_p.appendChild(calendar_link)
                table_div.appendChild(calendar_p)
            })

            return json;
        }).catch(ex => console.log("Failed to parse response from ScheduleTool: ", ex));
}

function genSchedulesList(div_name, calendar_uuid, gen_toggles, gen_color_pickers, transform_schedule_div)
{
    const options = {
        method: 'POST',
        body: JSON.stringify({ cal_uuid: calendar_uuid }),
        headers: {
        }
    }

    return fetch(schedule_tool_path + '?operation=LIST_SCH', options)
        .then(res => res.json())
        .then(function(json) {
            schedules = json.map(sch => { return { uuid: sch.uuid, name: sch.name, schedule: sch.schedule } })
                            .map(sch => { return { uuid: sch.uuid, name: sch.name, schedule: sch.schedule.replace(/'/g, '"') } })
                            .map(sch => { return { uuid: sch.uuid, name: sch.name, schedule: (sch.schedule.length === 0 ? "{\"num_blocks\": 24, \"day_info\": []}" : sch.schedule ) } })
                            .map(sch => { return { uuid: sch.uuid, name: sch.name, schedule: JSON.parse(sch.schedule) } });
            json.forEach(function(v, i) {
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
                var schedule_div = document.createElement('div')

                // Create link to the schedule
                const schedule_link = document.createElement('a')

                // Use './' to do a relative link from here
                schedule_link.href = './ScheduleView.html?uuid=' + v["uuid"]
                schedule_link.appendChild(document.createTextNode(v["name"]))

                var schedule_toggle;
                if(gen_toggles) {
                    // Create checkbox to toggle the schedule
                    schedule_toggle = document.createElement('input')

                    schedule_toggle.type = 'checkbox'
                    schedule_toggle.id = 'S' + v.uuid + '_toggle'
                    schedule_toggle.onchange = function() {
                        // Make sure we represent the change
                        schedule_toggle.checked = !schedule_toggle.checked

                        // Get all schedule cell nodes
                        var color_cells = document.querySelectorAll('[id^=schnode_' + v.uuid + '_')

                        color_cells.forEach(function(cell, i) {
                            // First: Check what the cell's view type is, and only
                            //   change how it's displayed if that view-type is
                            //   actually enabled
                            const content = cell.childNodes[0].textContent

                            // Only affect the cells if the view type matches the type of cell
                            const show_toggle = getShowToggleForViewType(content)
                            if(!show_toggle.checked) {
                                // If it's not enabled, then don't change anything
                                return;
                            }

                            if(schedule_toggle.checked) {
                                cell.style.display = 'block'
                            } else {
                                cell.style.display = 'none'
                            }
                        })

                        if(schedule_toggle.calc_schedules_list_height !== undefined)
                        {
                            schedule_toggle.calc_schedules_list_height()
                        }
                    }
                    schedule_toggle.onclick = function() {
                        schedule_toggle.onchange();
                    }
                    schedule_toggle.style.float = 'left'
                    schedule_toggle.checked = true
                }

                var schedule_color_picker;
                if(gen_color_pickers) {
                    // Create a color picker to choose what color we should represent this schedule with
                    schedule_color_picker = document.createElement('input')
                    schedule_color_picker.type = "color";
                    schedule_color_picker.id = 'S' + v["uuid"] + "_color";
                    schedule_color_picker.value = getUniqueRandomColor(128) // TODO
                    schedule_color_picker.onchange = function() {
                        console.log(v.uuid + ' color set to ' + schedule_color_picker.value)

                        // Get all schedule cell nodes
                        var color_cells = document.querySelectorAll('[id^=schnode_' + v.uuid + '_')

                        color_cells.forEach(function(cell, i) {
                            cell.style.backgroundColor = schedule_color_picker.value;
                        })
                    }
                }

                schedule_div.id = 'S' + v["uuid"]

                schedule_div.appendChild(schedule_link)
                if(gen_toggles) {
                    schedule_div.appendChild(schedule_toggle)
                }
                if(gen_color_pickers) {
                    schedule_div.appendChild(document.createElement('br'))
                    schedule_div.appendChild(schedule_color_picker)
                }

                if(transform_schedule_div !== undefined) {
                    schedule_div = transform_schedule_div(schedule_div)
                }

                schedules_list_div.appendChild(schedule_div)
            })

            return schedules;
        }).catch(ex => console.log("Failed to parse response from ScheduleTool: ", ex));
}

////////////////////////////////////////////////////////////////////////////////
// Request submit functions

function submitEditCalendarProperties() {
    if(!hasQuery('uuid')) {
        console.log("Missing required option 'uuid'")
        return
    }

    var calendar_uuid = getQuery('uuid')

    const calendar_name = document.querySelector("#cname");

    const options = {
        method: 'POST',
        body: JSON.stringify({
            uuid: calendar_uuid,
            updates: {
                name: calendar_name.value
            }
        }),
        headers: {
        }
    }

    fetch(schedule_tool_path + '?operation=EDIT_CAL', options)
        .then(res => res.json())
        .then(function(json) {
            console.log('Received response: ' + JSON.stringify(json))
            alert("Save successful.")
        }).catch(ex => console.log("Failed to parse response from ScheduleTool: ", ex));

}

function submitCreateCalendar() {
    const calendar_name = document.querySelector("#cname");

    const options = {
        method: 'POST',
        body: JSON.stringify({
            name: calendar_name.value
        }),
        headers: { }
    };

    fetch(schedule_tool_path + '?operation=CREATE_CAL', options)
        .then(res => res.json())
        .then(function(json) {
            console.log('createCalendar')

            window.location.replace('./CalendarView.html?uuid=' + json.uuid)
        }).catch(ex => console.log("Failed to parse response from ScheduleTool: ", ex));
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
            console.log('Received response: ' + JSON.stringify(json))
            alert("Save successful.")
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
    var shared_data = {}
    var has_shared = false
    if(hasQuery('share')) {
        const share_b64 = getQuery('share')
        var share_string = atob(share_b64)

        shared_data = deserializeSharedCalendarViewData(share_string)
        has_shared = true
    }

    var schedules_promise = genSchedulesList(schedule_div, calendar_uuid, true, true)
    genViewCalendar(cal_div, schedules_promise);

    // Make sure that we adjust the height of the schedules list so that it lines
    //   up with the calendar's height
    const cal_table_div = document.querySelector("div#" + cal_div);
    const schedules_list_div = document.querySelector("div#" + schedule_div);

    const calc_schedules_list_height = function() {
        console.log("Re-calculating SchedulesList div height.")
        schedules_list_div.style.height = cal_table_div.clientHeight;
    }

    // Wait until the schedules and calendar are all done before we calculate
    //   the height
    schedules_promise.then(function(schedules) {
        calc_schedules_list_height();

        return schedules
    })
    .then(function(schedules) {
        schedules.forEach(function(sch, i) {
            const sch_toggle = document.getElementById("S" + sch.uuid + "_toggle")
            sch_toggle.calc_schedules_list_height = calc_schedules_list_height;
        })

        return schedules
    })
    .then(function(schedules) {
        // Skip disabling the non-shared schedules if there is no 'share' param
        if(!has_shared || shared_data.schedules.length === 0) {
            return schedules;
        }

        // Go over each schedule, and disable it if it isn't enabled in the
        //   shared list
        schedules.forEach(function(sch, i) {
            var shared_sch = shared_data.schedules.find(sch_data => (sch_data.uuid === sch.uuid) )

            const sch_toggle = document.getElementById("S" + sch.uuid + "_toggle")
            if(shared_sch) {
                if(!shared_sch.enabled) {
                    // Only disable the schedule if it is not enabled
                    sch_toggle.onclick()
                }
            } else {
                // Disable the schedule if it isn't found
                sch_toggle.onclick()
            }
        })
        return schedules;
    })
    .then(function(schedules) {
        ////////////////////////////////////////////////////////////////////////
        // Set up the checkboxes for toggling which views to see
        var toggle_show = function(view_type, toggle) {
            toggle.checked = !toggle.checked

            schedules.forEach(function(sch, i) {
                // First, check: is this schedule enabled?
                //   If not, then skip over it
                const sch_toggle = document.getElementById("S" + sch.uuid + "_toggle")
                if(!sch_toggle.checked) {
                    return;
                }

                // Get all schedule cell nodes
                var color_cells = document.querySelectorAll('[id^=schnode_' + sch.uuid + '_')

                color_cells.forEach(function(cell, i) {
                    const content = cell.childNodes[0].textContent

                    // Only affect the cells if the view type matches the type of cell
                    if(content === view_type) {
                        if(toggle.checked) {
                            cell.style.display = 'block'
                        } else {
                            cell.style.display = 'none'
                        }
                    }
                })

            })

            calc_schedules_list_height()
        }

        const show_available_toggle = document.getElementById("show_available_toggle")
        show_available_toggle.onchange = function() {
            toggle_show("Available", show_available_toggle)
        }
        show_available_toggle.onclick = show_available_toggle.onchange

        const show_unavailable_toggle = document.getElementById("show_unavailable_toggle")
        show_unavailable_toggle.onchange = function() {
            toggle_show("Un-Available", show_unavailable_toggle)
        }
        show_unavailable_toggle.onclick = show_unavailable_toggle.onchange

        const show_tentative_toggle = document.getElementById("show_tentative_toggle")
        show_tentative_toggle.onchange = function() {
            toggle_show("Tentative", show_tentative_toggle)
        }
        show_tentative_toggle.onclick = show_tentative_toggle.onchange
        ////////////////////////////////////////////////////////////////////////

        if(has_shared) {
            if(!shared_data.view_toggles.available) {
                show_available_toggle.onclick()
            }
            if(!shared_data.view_toggles.unavailable) {
                show_unavailable_toggle.onclick()
            }
            if(!shared_data.view_toggles.tentative) {
                show_tentative_toggle.onclick()
            }
        }

        return schedules
    })
    .then(function(schedules) {
        if(!has_shared) {
            return schedules;
        }

        // Run each onchange now so that we ensure that the colors are up to date
        shared_data.schedules.forEach(function(schedule, i) {
            const sch_color_picker = document.getElementById('S' + schedule.uuid + '_color')
            sch_color_picker.value = schedule.color
            sch_color_picker.onchange()
        })

        return schedules;
    })


    // Make sure that the create schedule element can also point at the right page
    const create_schedule_element = document.querySelector("#" + create_schedule_link);
    create_schedule_element.href += "?uuid=" + calendar_uuid;

    // Add share button
    const share_button = document.getElementById('share')
    share_button.onclick = function() {
        var to_share = serializeSharedCalendarViewData(schedules_list_div)
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

        alert("The address-bar has been modified with the share-link, don't forget to copy it!")
    }
}

function loadIndex(calendars_list_div_name, schedules_list_div_name) {
    var calendars_list_promise = genCalendarsList(calendars_list_div_name)

    calendars_list_promise.then(function(json) {
        var schedules_promises = new Array();

        json.forEach(function(cal, i) {
            schedules_promises.push(genSchedulesList(schedules_list_div_name, cal.uuid, false, false,
                schedule_div => {
                    const p = document.createElement('p')
                    p.appendChild(schedule_div)
                    return p
                }))
        })

        return Promise.all(schedules_promises)
    })
    .then(function(schedules_array) {
        var schedules = schedules_array.flat()

        const search_input_div = document.getElementById('sch_search')
        search_input_div.onkeyup = function() {
            schedules.forEach(function(sch) {
                const sch_div = document.getElementById('S' + sch.uuid)

                // Names are searched for case-insensitive
                // UUIDs are searched for case-sensitive
                if(sch.name.toLowerCase().includes(search_input_div.value.toLowerCase()) ||
                   sch.uuid.includes(search_input_div.value))
                {
                    sch_div.style.display = 'block'
                }
                else {
                    sch_div.style.display = 'none'
                }
            })
        }
    })

    // Fix some style issues here:
    const search_div = document.getElementById('search_div')
    const schedules_list_div = document.getElementById(schedules_list_div_name)

    schedules_list_div.style.width = search_div.clientWidth;
}

////////////////////////////////////////////////////////////////////////////////
// Utilities

function serializeSharedCalendarViewData(schedules_list_div) {
    var to_share = {
        schedules: [ ], // { uuid, enabled, color }
        view_toggles: {
            available: true,
            unavailable: true,
            tentative: true
        }
    }

    schedules_list_div.childNodes.forEach(div => {
        const schedule_a = div.childNodes[0]
        const schedule_input = div.childNodes[1]
        // [2] == <br>
        const schedule_color = div.childNodes[3]

        var params = new URLSearchParams(schedule_a.search)
        var schedule_uuid = params.get('uuid')

        to_share.schedules.push({
            uuid: schedule_uuid,
            enabled: schedule_input.checked,
            color: schedule_color.value
        })
    })

    to_share.view_toggles.available = document.getElementById("show_available_toggle").checked
    to_share.view_toggles.unavailable = document.getElementById("show_unavailable_toggle").checked
    to_share.view_toggles.tentative = document.getElementById("show_tentative_toggle").checked

    return JSON.stringify(to_share)
}

function deserializeSharedCalendarViewData(shared_data_str) {
    return JSON.parse(shared_data_str)
}

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

function getShowToggleForViewType(view_type) {
    // Add more view-types as necessary
    if(view_type === "Available") {
        return document.getElementById("show_available_toggle")
    } else if(view_type === "Un-Available") {
        return document.getElementById("show_unavailable_toggle")
    } else if(view_type === "Tentative") {
        return document.getElementById("show_tentative_toggle")
    } else {
        return undefined
    }
}

// Code from https://stackoverflow.com/a/17373688
function getRandomColor(brightness) {
    function randomChannel(brightness){
        var r = 255-brightness;
        var n = 0|((Math.random() * r) + brightness);
        var s = n.toString(16);
        return (s.length==1) ? '0'+s : s;
    }
    return '#' + randomChannel(brightness) + randomChannel(brightness) + randomChannel(brightness);
}

var PREVIOUSLY_CHOSEN_COLORS = []
function getUniqueRandomColor(brightness) {
    var color = "#000000";

    do {
        color = getRandomColor(brightness);
    } while(PREVIOUSLY_CHOSEN_COLORS.includes(color));

    PREVIOUSLY_CHOSEN_COLORS.push(color);

    return color;
}

