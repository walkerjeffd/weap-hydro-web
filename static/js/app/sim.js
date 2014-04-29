define([
  'underscore',
  'd3'
], function (_, d3) {
  var SimModel = function() {
    'use strict';

    var output = [];

    var computePe = function (params) {
      // effective precipitation (snowmelt+precip)
      var Ac = params.get('Ac_0'),     // snow depth
          T_s = params.get('T_s'),     // freeze temp
          T_l = params.get('T_l'),     // melt temp
          m_c, m_r, P_e;

      for (var i = 0, n = output.length; i < n; i++) {
        if (output[i]['T'] < T_s) {                   // melt coefficient
          m_c = 0;
        } else if (output[i]['T'] > T_l) {
          m_c = 1;
        } else {
          m_c = (output[i]['T'] - T_s) / (T_l - T_s);
        }
        m_r = Ac * m_c;                            // snow melt rate
        Ac = Ac + (1 - m_c) * output[i]['P_i'] - m_r; // snow accumulation
        P_e = output[i]['P_i'] * m_c + m_r;           // effective precipitation
        output[i]['Ac'] = Ac;
        output[i]['melt'] = m_r;
        output[i]['P_e'] = P_e;
      }
    };

    var computePET = function (params) {
      var lat_rad = params.get('latitude') * Math.PI / 180, // latitude in radians
      alpha = 0.15;
          // alpha = params.get('alpha');

      var lambda, gamma, dr, del, ws, es, Delta, D, S0, Rn, G, PET;

      for (var i = 0, n = output.length; i < n; i++) {
        lambda = 2.501 - 0.002361*output[i]['T']; // latent heat of varporization
        gamma = 0.065437 + 0.0000644*output[i]['T']; // psychometric constant

        dr = 1 + (0.033*Math.cos(2 * Math.PI * output[i]['Jday'] / 365)); // relative earth-sun distance
        del = 0.4093 * Math.sin(2 * Math.PI * output[i]['Jday'] / 365 - 1.405); // solar declination
        ws = Math.acos(-Math.tan(lat_rad) * Math.tan(del)); // sunset hour angle

        es = 0.6108 * Math.exp(17.27 * output[i]['T'] / (237.2 + output[i]['T'])); // saturation vapor pressure (kPa)
        Delta = 4098 * es / ((237.3 + output[i]['T']) * (237.3 + output[i]['T'])); // gradient of vapor pressure

        D = es - es*output[i]['RH']/100; // vapor pressure deficit

        S0 = 15.392 * dr * (ws * Math.sin(lat_rad) * Math.sin(del) + Math.cos(lat_rad) * Math.cos(del) * Math.sin(ws)) * lambda; // extraterrestrial solar radiation (MJ/m2/day)

        Rn = (S0 * (1-alpha)*(0.25*0.5*output[i]['f_c']) - output[i]['f_c']*(0.34 - 0.14*Math.sqrt(es *(output[i]['RH']/100))))*Math.pow(output[i]['T']+273, 4) * 4.903 * Math.pow(10, -9) / lambda; // net radiation (mm/day)

        G = 0; // soil heat flux density (mm/day)
        PET = (Rn-G) * (Delta/(Delta + gamma*(1+0.33*output[i]['u2']))) + (Delta/(Delta + gamma*(1+0.33*output[i]['u2']))) * (900 / (output[i]['T']+273)) * output[i]['u2'] * D; // PET (mm/day)

        output[i]['PET'] = PET;
      }
    };

    // public function
    var setInput = function(input, latitude) {
      console.log('SimModel: set input');
      output.length = 0;

      // copy input to output, compute derived, and add placeholders for others
      for (var i = 0, len = input.length; i < len; i++) {
        var d = {};

        // copy input values
        d.Date = input[i].Date;
        d.P_i = input[i].P_i;
        d.T = input[i].T;
        d.f_c = input[i].f_c;
        d.RH = input[i].RH;
        d.u2 = input[i].u2;

        d.Jday = d3.time.dayOfYear(d.Date);

        output.push(d);
      }
    };

    var computeTerms = function(z, inp, params) {
      var k_c = params.get('k_c'),     // crop coefficient
          RRF = params.get('RRF'),     // runoff resistance factor
          f = params.get('f'),         // partition coefficient
          k_1 = params.get('k_1'),     // hydraulic conductivity of root zone
          k_2 = params.get('k_2');     // hydraulic conductivity of deep zoil

      var ET, Ro, Iflow, Perc, Bflow, Q;

      ET = inp.PET * k_c * (5*z[0] - 2*z[0]*z[0]) / 3;  // evapotranspiration (mm/day)
      Ro = inp.P_e * Math.pow(z[0], RRF);               // surface runoff (mm/day)
      Iflow = f * k_1 * z[0] * z[0];                    // interflow (mm/day)
      Perc = (1-f) * k_1 * z[0] * z[0];                 // percolation (mm/day)
      Bflow = k_2 * z[1] * z[1];                        // baseflow (mm/day)
      Q = Ro + Iflow + Bflow;                           // streamflow (mm/day)

      return {
        P_e: inp.P_e,
        ET: ET,
        Ro: Ro,
        Iflow: Iflow,
        Perc: Perc,
        Bflow: Bflow,
        Q: Q
      };
    };

    var computeDeriv = function(z, inp, params) {
      var D_1 = params.get('D_1'),     // depth of root zone
          D_2 = params.get('D_2'),     // depth of deep soil
          dz1,
          dz2,
          terms = computeTerms(z, inp, params);

      dz1 = (terms.P_e - terms.ET - terms.Ro - terms.Iflow - terms.Perc) / D_1;   // change in root zone storage (mm/day)
      dz2 = (terms.Perc - terms.Bflow) / D_2;                       // change in deep soil storage (mm/day)

      return [dz1, dz2];
    };

    var solve = function(params) {
      var h = 0.1,
          D_1 = params.get('D_1'),     // depth of root zone
          D_2 = params.get('D_2'),     // depth of deep soil
          t = 0,
          z = [0, 0],
          dz = [0, 0],
          out = [],
          k1, k2, k3, k4,
          terms,
          inp;

      t = 0;

      z = [params.get('z1_0'), params.get('z2_0')];

      while (t < output.length) {
        inp = output[Math.floor(t)];
        terms = computeTerms(z, inp, params);

        k1 = computeDeriv(z, inp, params);
        k2 = computeDeriv([z[0]+h/2*k1[0], z[1]+h/2*k1[1]], inp, params);
        k3 = computeDeriv([z[0]+h/2*k2[0], z[1]+h/2*k2[1]], inp, params);
        k4 = computeDeriv([z[0]+h*k3[0], z[1]+h*k3[1]], inp, params);

        dz[0] = (1/6) * (k1[0] + 2*k2[0] + 2*k3[0] + k4[0]);
        dz[1] = (1/6) * (k1[1] + 2*k2[1] + 2*k3[1] + k4[1]);

        z[0] = z[0] + dz[0]*h;
        z[1] = z[1] + dz[1]*h;
        t = t + h;

        if (Math.abs(Math.round(t) - t) < 0.0000001) {
          out.push({
            z1: z[0],
            z2: z[1],
            d1: z[0]*D_1,
            d2: z[1]*D_2,
            P_e: terms.P_e,
            ET: terms.ET,
            Ro: terms.Ro,
            Iflow: terms.Iflow,
            Perc: terms.Perc,
            Bflow: terms.Bflow,
            Q: terms.Q
          });
        }
      }

      return out;
    };

    var run = function(params) {
      computePe(params);
      computePET(params);

      var out = solve(params);

      for (var i = 0, len = output.length; i < len; i++) {
        output[i].z1 = out[i].z1;
        output[i].z2 = out[i].z2;
        output[i].d1 = out[i].d1;
        output[i].d2 = out[i].d2;
        output[i].P_e = out[i].P_e;
        output[i].ET = out[i].ET;
        output[i].Ro = out[i].Ro;
        output[i].Iflow = out[i].Iflow;
        output[i].Perc = out[i].Perc;
        output[i].Bflow = out[i].Bflow;
        output[i].Q = out[i].Q;
      }
    };

    return {
      run: run,
      output: output,
      setInput: setInput
    };
  };

  return SimModel;
});
