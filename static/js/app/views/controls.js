define([
	'jquery',
	'underscore',
	'backbone',
  'app/templates'
], function ($, _, Backbone, Templates) {
	var ControlView = Backbone.View.extend({
		template: Templates.controls,

    events: {
      'click #btn-save': 'saveApp',
      'click #btn-export': 'exportOutput'
    },

    initialize: function (options) {
      this.dispatcher = options.dispatcher;
      $('#btn-delete').on('click', this.deleteApp.bind(this));

      this.render();
    },

    render: function () {
      this.$el.html(this.template());
    },


    saveApp: function() {
      console.log('Saving...');
      var that = this;
      this.model.save({},
        {
          success: function() {
            that.dispatcher.trigger('alert', 'Model saved', 'success');
            that.dispatcher.trigger('status', 'Ready!');
          },
          error: function(e) {
            that.dispatcher.trigger('alert', 'Model save failed!', 'error');
            that.dispatcher.trigger('status', 'Unsaved changes...');
          }
        }
      );
    },

    exportOutput: function() {
      console.log('Export');
      this.dispatcher.trigger('exportOutput');
    },

    deleteApp: function() {
      console.log('Deleting...');
      this.model.destroy({
        success: function(model, response, options) {
          window.location.reload();
        },
        error: function(model, response, options) {
          console.log('error: ', response);
        }
      });
    }

	});

	return ControlView;
});