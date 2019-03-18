/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
const BoxSDK = require('box-node-sdk');
const fs = require('fs');
var jsonConfig = JSON.parse(fs.readFileSync('CLI-private.json', 'utf8'));

var sdk = BoxSDK.getPreconfiguredInstance(jsonConfig);
var client = sdk.getAppAuthClient('enterprise');

sdk.getEnterpriseAppAuthTokens('59194496', null, function (error, token) {
    console.log('Service account token ', token.accessToken);
})

exports.webhookTrigger = (req, res) => {
  let message = req.query.message || req.body.message || 'Hello World!';
  console.log('Event -- ',req.body);
    if( req.body != undefined ) {
        var event = req.body.trigger;
        var resourceType = req.body.source.type;
        var fileId;
        if( resourceType != undefined && resourceType == 'file' )   {
            fileId = req.body.source.id;
                if( event == 'FILE.CREATED' )   {
                    // add comments to the file
                    client.comments.create(fileId,'New test result added');
                    client.comments.create(fileId,'New test validated against Python scripts');
                    client.folders.create('70423468094', 'ACME CRO Results')
                        .then(folder => {
                            client.folders.create(folder.id,'Accepted')
                                .then(folder =>   {
                                client.files.move(fileId,folder.id);
                            });
                    });
                }
            }
        
        }
  res.status(200).send(message);
};
