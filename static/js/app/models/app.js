define([
  'underscore',
  'backbone',
  'd3',
  'app/utils',
  'backbone.localStorage'
], function (_, Backbone, d3, Utils) {
  'use strict';

  var AppModel = Backbone.Model.extend({
    defaults: {
      watershedName: '',
      input: [],
      latitude: null,
      z1_0: 0.5,
      k_c: 0.5,
      RRF: 0.5,
      f: 0.5,
      D_1: 50,
      k_1: 1,
      z2_0: 0.5,
      D_2: 50,
      k_2: 1,
      Ac_0: 0,
      T_s: -2,
      T_l: 2
    },

    validate: function(attrs, options) {
      if ((attrs.latitude < 20) || (attrs.latitude > 50)) {
        return 'Latitude must be between 20 and 50 degrees North';
      }
      if (attrs.latitude === null || !isFinite(attrs.latitude)) {
        return 'Latitude must be a number between 20 and 50 degNorth in decimal degrees (e.g. 42.4)';
      }
      if (attrs.input.length === 0) {
        return 'Input data is missing';
      }
    },

    localStorage: new Backbone.LocalStorage('AppSettings'),

    initialize: function (options) {
      console.log('AppModel: initialize');

      this.isNewModel = true;

      this.variableLabels = {
        P_i: 'Precip (mm/d)',
        Pe: 'Effective Precip (mm/d)',
        z1: 'Root Zone Storage (mm)',
        z2: 'Groundwater Storage (mm)'
      };
    },

    isNew: function () {
      return this.isNewModel;
    },

    parse: function(response, options) {
      // Parse data from localStorage

      // convert d.Date from string to Date object
      if (response.input) {
        _.each(response.input, function(d) {
          d.Date = new Date(d.Date);
        });
      }
      return response;
    },

    loadFromFile: function(obj) {
      obj = this.parse(obj);
      this.set(obj);
    }
  });

  return AppModel;
});
