define([
  'jquery',
  'underscore',
  'backbone',
  'bootstrap',
  'd3',
  'app/charts',
  'app/utils',
  'app/sim',
  'app/views/controls',
  'app/views/chart'
], function ($, _, Backbone, Bootstrap, d3, Charts, Utils, SimModel, ControlsView, ChartView) {
  'use strict';

  var SimulationPage = Backbone.View.extend({
    charts: [],

    formats: {
      'number': d3.format("4.2f")
    },

    events: {
      'click #btn-add-chart-ok': 'addChartFromModal'
    },

    initialize: function(options) {
      console.log('Initialize: SimulationPage');
      this.dispatcher = options.dispatcher;
      this.controlsView = new ControlsView({model: this.model, el: this.$('#controls'), dispatcher: this.dispatcher});

      this.simModel = new SimModel();

      this.zoomTranslate = [0, 0];
      this.zoomScale = 1;

      this.initCharts();
      this.initSliders();
      this.render();

      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'change:input', this.setInput);
      this.listenTo(this.model, 'change', this.updateSliders);

      this.dispatcher.trigger('status', 'Ready!');
    },

    setInput: function(model, response, options) {
      this.simModel.setInput(this.model.get('input'), this.model.get('latitude'));
    },

    addChartFromModal: function(e) {
      var that = this;

      var variables = [];
      this.$("#select-add-chart").children(":selected").each(function(i, option) {
        variables.push(option.value);
      });

      if (variables.length > 0) {
        this.addChart(variables);
      }
    },

    focusTheory: function(x) {
      if (x !== undefined) {
        var input = this.model.get('input');
        var i = 0, len = input.length;

        // this.simModel.run(this.model);

        for (; i < (len-1); i++) {
          if (input[i+1].Date > x) {
            break;
          }
        }

        this.model.set("PET", this.simModel.output[i].PET);
        this.soilChart.focus(this.simModel.output[i].W);
        this.gwChart.focus(this.simModel.output[i].WGW);
      } else {
        this.soilChart.focus();
        this.gwChart.focus();
      }
    },

    initSliders: function() {
      var that = this;
      this.updateSliders();
      $(".slider").on('input', function() {
        that.$("#param-"+this.name).text(this.value);
        that.model.set(this.name, +this.value);
      });
    },

    updateSliders: function() {
      var that = this;
      this.$(".slider").each(function() {
        this.value = +that.model.get(this.name);
        that.$("#param-"+this.name).text(this.value);
      });
    },

    computeSummary: function(data) {
      var sumPrecip = Utils.sum(_.pluck(data, 'P')),
          sumFlow = Utils.sum(_.pluck(data, 'Q')),
          sumEvap = Utils.sum(_.pluck(data, 'ET')),
          sumOutflow = sumFlow+sumEvap,
          initSoil = this.model.get('S0'),
          endSoil = data[data.length-1]['S'],
          initGW = this.model.get('G0'),
          endGW = data[data.length-1]['G'],
          netStorage = (endSoil+endGW) - (initSoil+initGW),
          err = netStorage + sumOutflow - sumPrecip;

      return {
        sumInflow: sumPrecip,
        sumOutflow: sumOutflow,
        netStorage: netStorage,
        err: err
      };
    },

    render: function() {
      if (this.model.get('input') && this.model.get('input').length > 0) {
        this.simModel.run(this.model);
        // var stats = this.computeSummary(this.simModel.output);

        // d3.select('#sum-in').text(this.formats.number(stats.sumInflow));
        // d3.select('#sum-out').text(this.formats.number(stats.sumOutflow));
        // d3.select('#sum-net').text(this.formats.number(stats.netStorage));
        // d3.select('#sum-error').text(this.formats.number(stats.err));

        d3.select('#chart-storage').call(this.chartStorage.data(this.simModel.output));

        this.charts.forEach(function(chart) {
          chart.update(this.simModel.output);
        }.bind(this));
      }

      var attrs = _.without(d3.keys(this.model.changedAttributes()), 'PET');
      if (!this.model.isNew() && this.model.hasChanged() && attrs.length > 0) {
        this.dispatcher.trigger('status', 'Unsaved changes...');
      } else {
        this.dispatcher.trigger('status', 'Ready!');
      }
    },

    zoomCharts: function(translate, scale) {
      this.zoomTranslate = translate;
      this.zoomScale = scale;
      this.charts.forEach(function(chart) {
        chart.zoom(translate, scale);
      });
    },

    addChart: function(variables) {
      console.log("Add Chart", variables);
      var newChart = new ChartView({
        model: this.model,
        variables: variables,
        dispatcher: this.dispatcher
      });
      newChart.render().zoom(this.translate, this.scale);
      this.$('.chart-container').append(newChart.el);
      this.charts.push(newChart);
      this.render();
    },

    initCharts: function() {
      console.log('Init charts');
      var that = this;

      this.chartStorage = new Charts.ZoomableTimeseriesLineChart()
        .id(this.cid)
        .x(function(d) { return d.Date; })
        .width(550)
        .height(200)
        .yVariables(['z1', 'z2'])
        .yVariableLabels(this.model.variableLabels)
        .onMousemove(function(x) { this.dispatcher.trigger('focus', x); }.bind(this))
        .onMouseout(function(x) { this.dispatcher.trigger('focus'); }.bind(this))
        .onZoom(function(translate, scale) { this.zoomCharts(translate, scale); }.bind(this));

      this.addChart(['P_i']);

    }

  });

  return SimulationPage;
});
