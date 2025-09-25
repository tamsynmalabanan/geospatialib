from channels.generic.websocket import WebsocketConsumer
import logging
from asgiref.sync import async_to_sync
from django.template.loader import get_template
logger = logging.getLogger('django')

class ThematicMapConsumer(WebsocketConsumer):
    def connect(self):
        self.map_id = self.scope["url_route"]["kwargs"]["map_id"]
        self.map_group_id = f"map_{self.map_id}"
        logger.info({
            'map_id': self.map_id,
            'map_group_id': self.map_group_id,
        })

        async_to_sync(self.channel_layer.group_add)(
            self.map_group_id, self.channel_name
        )

        self.accept()

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.map_group_id, self.channel_name
        )

    def map_generated(self, event):
        logger.info(event)
        html = get_template('helpers/partials/find_layers/response.html').render(context={
            'data': event['data']
        })
        self.send(text_data=html)

    # def receive(self, text_data):
    #     text_data_json = json.loads(text_data)
    #     message = text_data_json["message"]

    #     self.send(text_data=json.dumps({"message": message}))