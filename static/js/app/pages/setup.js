define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'app/charts',
  'app/utils'
], function ($, _, Backbone, d3, Charts, Utils) {
  'use strict';

  var SetupPage = Backbone.View.extend({
    charts: {},

    events: {
      'keyup #input-name': 'updateName',
      'keyup #input-latitude': 'updateLatitude',
      'click #btn-save': 'saveApp',
      'click #btn-delete': 'deleteApp'
    },

    initialize: function(options) {
      console.log('Initialize: SetupPage');

      this.dispatcher = options.dispatcher;

      this.$name = this.$('#input-name');
      this.$latitude = this.$('#input-latitude');

      this.$('#instructions').html($('#modal-help .modal-body').html());

      this.initDragDrop(this.$('#holder-input'), this.loadInputData, this);
      this.initDragDrop(this.$('#holder-load'), this.loadExistingModel, this);
      this.initCharts();

      this.listenTo(this.model, 'change:input', this.render);
      this.listenTo(this.model, 'sync', this.updateModelInfo);

      this.render();
      this.dispatcher.trigger('status', 'Ready!');
    },

    saveApp: function() {
      console.log('Saving...');
      var that = this;
      console.log(this.model);
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
    },

    updateModelInfo: function() {
      this.$name.val(this.model.get('watershedName'));
      this.$latitude.val(this.model.get('latitude'));
    },

    updateName: function() {
      // console.log(this.$('#input-name').val());
      this.model.set('watershedName', this.$('#input-name').val());
    },

    updateLatitude: function() {
      // console.log(this.$('#input-latitude').val());
      var latitude = this.$('#input-latitude').val()*1;
      this.model.set('latitude', parseFloat(latitude));
    },

    initDragDrop: function(el, callback, context) {
      var that = this;

      console.log('Initializing: drag and drop holder');
      if (typeof window.FileReader === 'undefined') {
        alert('FileReader not supported!');
      }

      el.on('dragover', function () { $(this).addClass('hover'); return false; });
      el.on('dragleave dragend', function () { $(this).removeClass('hover'); return false; });
      el.on('drop', function (e) {
        console.log('Event: file dropped on holder');
        that.dispatcher.trigger('status', 'Loading file...');
        $(this).removeClass('hover');
        e.preventDefault();

        var file = e.originalEvent.dataTransfer.files[0],
            reader = new FileReader();

        var fileName = file.name,
            fileNameParts = fileName.split('.'),
            fileExtension = fileNameParts[fileNameParts.length-1].toLowerCase();

        var parser;
        if (fileExtension == "json") {
          parser = JSON.parse;
        } else if (fileExtension == "csv") {
          parser = d3.csv.parse;
        } else {
          console.log("Error: Unable to infer format for filename " + fileName + " (must end in .csv or .json)");
          return false;
        }

        reader.onload = function (event) {
          var data = parser(event.target.result);
          callback(data, context);
        };

        reader.readAsText(file);

        return false;
      });
    },

    loadExistingModel: function(data, that) {
      console.log(data);
      that.model.loadFromFile(data);
      that.updateModelInfo();
    },

    loadInputData: function(data, that) {
      var dateFormat = d3.time.format('%m/%d/%Y');

      var parsers = {
        'Date': function(v) { return dateFormat.parse(v); },
        'P_i': function(v) { return +v; },
        'T': function(v) { return +v; },
        'f_c': function(v) { return +v; },
        'RH': function(v) { return +v; },
        'u2': function(v) { return +v; }
      };

      data.forEach(function(row) {
        d3.keys(parsers).forEach(function (key) {
          if (key in row) {
            row[key] = parsers[key](row[key]);
          }
        });
      });

      // sort dates
      console.log('Sorting data by Date');
      data.sort(function (a, b) {
        if (a.Date < b.Date)
          return -1;
        if (a.Date > b.Date)
          return 1;
        return 0;
      });

      // check dates
      console.log('Checking dates');
      if (!Utils.checkDates(_.pluck(data, 'Date'))) {
        console.log('Error: Dates of input data are either incomplete or incorrect');
        return null;
      }

      that.model.set('input', data);
      that.dispatcher.trigger('status', 'Ready!');
    },

    render: function() {
      console.log('Rendering...');
      this.dispatcher.trigger('status', 'Rendering...');

      if (this.model.get('input') && this.model.get('input').length > 0) {
        console.log('Showing charts');
        this.$('#instructions').hide();
        d3.select('#chart-precip').call(this.charts.Precip.data(this.model.get('input')));
        d3.select('#chart-temp').call(this.charts.Temp.data(this.model.get('input')));
        d3.select('#chart-cloud').call(this.charts.Cloud.data(this.model.get('input')));
        d3.select('#chart-rh').call(this.charts.RH.data(this.model.get('input')));
        d3.select('#chart-wind').call(this.charts.Wind.data(this.model.get('input')));

      } else {
        this.$('#instructions').show();
      }

      if (!this.model.isNew() && this.model.hasChanged()) {
        this.dispatcher.trigger('status', 'Unsaved changes...');
      } else {
        this.dispatcher.trigger('status', 'Ready!');
      }
    },

    initCharts: function() {
      this.charts.Precip = Charts.Timeseries()
          .xVariable('Date')
          .yVariable('P_i')
          .width(550)
          .height(150)
          .yLabel('Precipitation (mm/d)')
          .yAxis(d3.svg.axis().ticks(5).orient("left"));

      this.charts.Temp = Charts.Timeseries()
          .xVariable('Date')
          .yVariable('T')
          .width(550)
          .height(150)
          .yLabel('Mean Air Temperature (degC)')
          .yAxis(d3.svg.axis().ticks(5).orient("left"));

      this.charts.Cloud = Charts.Timeseries()
          .xVariable('Date')
          .yVariable('f_c')
          .width(550)
          .height(150)
          .yLabel('Fraction Cloudiness')
          .yAxis(d3.svg.axis().ticks(5).orient("left"));

      this.charts.RH = Charts.Timeseries()
          .xVariable('Date')
          .yVariable('RH')
          .width(550)
          .height(150)
          .yLabel('Relative Humidity (%)')
          .yAxis(d3.svg.axis().ticks(5).orient("left"));

      this.charts.Wind = Charts.Timeseries()
          .xVariable('Date')
          .yVariable('u2')
          .width(550)
          .height(150)
          .yLabel('Wind Speed (m/s)')
          .yAxis(d3.svg.axis().ticks(5).orient("left"));

    }

  });

  return SetupPage;
});
