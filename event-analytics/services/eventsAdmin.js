// Imports the Google Cloud client library
const Request = require("request");
const BigQuery = require('@google-cloud/bigquery');

// Your Google Cloud Platform project ID
const projectId = 'sixth-hawk-194719';
const datesetId = 'box_events';
const table_eventsAdmin = 'events_admin';
const table_eventsAdmin_createdBy = 'events_admin_created_by';
const table_add_det = 'events_admin_additional_details';
const table_source = 'events_admin_source';
const table_parent = 'events_admin_source_parent';
var access_token;

// Creates a client
const bigquery = new BigQuery({
    projectId: projectId,
});

module.exports = {
    callEventsAPI: function(accessToken) {
        access_token = accessToken;
        Request(getEventURL(), callback);

    }

}

function getEventURL(stream_position)  {
    var eventURL = 'https://api.box.com/2.0/events?stream_type=admin_logs&limit=500';
    if( stream_position != 'undefined') {
        eventURL = eventURL + '&stream_position=' + stream_position;
    }
    
       var options = {
            method: 'GET',
            url: eventURL,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + access_token
            }
        }
    return options;
}

function getBQDate(date)    {
         var bq_date = BigQuery.datetime({
         year: date.getFullYear(),
          month: date.getMonth(),
          day: date.getDay(),
          hours: date.getHours(),
          minutes: date.getMinutes(),
          seconds: date.getSeconds()
         });
    return bq_date;
}

function callback(error, response, body) {
    if(error)
       console.log(error);
    var res = JSON.parse(response.body);
    var next_stream_position = res.next_stream_position;
    console.log('next_stream_position -- ',next_stream_position);
    var entries = res.entries;
    console.log('response ====', entries);
    var counter;
    for(counter=0; counter<entries.length; counter++)   {
        var created_date = new Date(entries[counter].created_at);
         var bq_created_date = getBQDate(created_date);

        var event_admin_row = [{event_id: entries[counter].event_id, created_at: bq_created_date, event_type: entries[counter].event_type, ip_address: entries[counter].ip_address, session_id: entries[counter].session_id, inserted_at: getBQDate(new Date())}];
        console.log('event_admin_row -',event_admin_row);
        insertBigQuery(table_eventsAdmin, event_admin_row);
        
        var created_by = entries[counter].created_by;
        var event_admin_created_by_row = [{event_id: entries[counter].event_id, type: created_by.type, id: created_by.id, name: created_by.name, login: created_by.login}];
        console.log('event_admin_created_by_row -',event_admin_created_by_row);
        insertBigQuery(table_eventsAdmin_createdBy, event_admin_created_by_row);

        var source = entries[counter].source;
        if( source != null )    {
            var source_row = [{event_id: entries[counter].event_id, item_type: source.item_type, item_id: source.item_id, item_name: source.item_name}];
            console.log('source_row -',source_row);
            insertBigQuery(table_source, source_row);
            var parent = source.parent;
            if(parent != null)     {
                var parent_row = [{source_item_id: source.item_id, type: parent.type, name: parent.name, id: parent.id}];
                console.log('parent_row -',parent_row);
                insertBigQuery(table_parent, parent_row);
            }

        }
        
        var add_det = entries[counter].addtional_details;
        if(add_det != null)     {
            var add_det_row = [{event_id: entries[counter].event_id, version_id: add_det.version_id, size: add_det.size}];
            console.log('add_det_row -',add_det_row);
            insertBigQuery(table_add_det, add_det_row);
        }

    }
    if (typeof next_stream_position != 'undefined') {
        Request(getEventURL(next_stream_position), callback);
    }
}

function insertBigQuery(tableId, rows)   {
  bigquery
    .dataset('box_events')
    .table(tableId)
    .insert(rows)
    .then(() => {
      console.log(`Inserted ${rows.length} rows`);
    })
    .catch(err => {
      if (err && err.name === 'PartialFailureError') {
        if (err.errors && err.errors.length > 0) {
          console.log('Insert errors:');
          err.errors.forEach(err => console.error(err));
        }
      } else {
        console.error('ERROR:', err);
      }
    });
   
}
