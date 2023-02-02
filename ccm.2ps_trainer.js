"use strict";

/**
 * @overview <i>ccmjs</i>-based web component for 2PS Trainer.
 * @author André Kless <andre.kless@web.de> 2022-2023
 * @license The MIT License (MIT)
 * @copyright EILD.nrw 2022-2023
 * @version latest (1.0.0)
 */

(() => {
  const component = {
    name: "2ps_trainer",
    ccm: "./libs/ccm/ccm.js",
    config: {
      // "anytime_finish": true,
      "cols": [ "", "T1", "T2", "A", "a1", "a2", "B", "b1", "b2" ],
      "css": [ "ccm.load",
        [ "./libs/bootstrap-5/css/bootstrap.css", "./resources/styles.css" ],
        { "url": "./libs/bootstrap-5/css/bootstrap-fonts.css", "context": "head" },
      ],
      "feedback": true,
      "helper": [ "ccm.load", { "url": "./libs/ccm/helper.js", "type": "module" } ],
      "html": [ "ccm.load", { "url": "./resources/templates.js", "type": "module" } ],
      // "onchange": event => console.log( event ),
      "onfinish": { "log": true, "restart": true },
      // "onready": event => console.log( event ),
      // "onstart": event => console.log( event ),
      "operand": [ 1, 9 ],
      "ops": {
        "b": "BOT",
        "l": "lock({A})",
        "r": "read({A},{a})",
        "o": "{a} = {a} {o} {x}",
        "w": "write({A},{a})",
        "u": "unlock({A})",
        "c": "commit",
      },
      "schedules": {
        "rules": [
          [ "b", "l" ],
          [ "b", "u" ],
          [ "b", "r" ],
          [ "r", "o" ],
          [ "o", "w" ],
          [ "w", "c" ],
          [ "l", "c" ],
          [ "u", "c" ]
        ],
        "rounds": 10,
        "inputs": {
          "consistence": 20,
          "legal": 40,
          "serializable": 60,
          "conflict_serializable": 80
        }
      },
      "text": {
        "title": "2PS-Trainer",
        "task": "Prüfen Sie den folgenden Schedule auf Konsistenz, Legalität, Serialisierbarkeit und Konfliktserialisierbarkeit.",
        "consistence": "Konsistent",
        "legal": "Legal",
        "serializable": "Serialisierbar",
        "conflict_serializable": "Konfliktserialisierbar",
        "yes": "Ja",
        "neither": "",
        "no": "Nein",
        "submit": "Abschicken",
        "next": "Nächste",
        "finish": "Neustart"
      },
      "toposort": [ "ccm.load", { "url": "./libs/toposort/toposort.js#toposort", "type": "module" } ],
      "value": [ 1, 9 ],
    },
    Instance: function () {
      let $, data;
      this.init = async () => {
        $ = Object.assign( {}, this.ccm.helper, this.helper ); $.use( this.ccm );
      };
      this.ready = async () => {
        this.onready && await this.onready( { instance: this } );
      };
      this.start = async () => {
        data = await $.dataset( this.data );
        if ( !data.sections ) data = { correct: 0, sections: [] };
        data.total = this.schedules.length || this.schedules.rounds;
        this.next();
        this.onstart && await this.onstart( { instance: this } );
      };
      this.next = () => {
        const schedule = this.schedules[ data.sections.length ] || this.schedules;
        const section = {
          a: schedule.a || randomFromRange( ...this.value ),
          b: schedule.b || randomFromRange( ...this.value ),
          solution: schedule.solution,
          steps: schedule.steps || [],
        };
        if ( !section.steps.length ) {
          let steps = [];
          Object.keys( this.ops ).forEach( op => {
            for ( let i = 1; i <= 2; i++ )
              if ( op === 'b' || op === 'c' )
                steps.push( op + i );
              else
                [ 'A', 'B' ].forEach( attr => steps.push( op + i + attr ) );
          } );
          console.log(steps);
          const rules = [];
          schedule.rules.forEach( ( [ op1, op2 ] ) => {
            for ( let i = 1; i <= 2; i++ )
              [ 'A', 'B' ].forEach( attr => {
                rules.push( [
                  op1 + i + ( op1 === 'b' || op1 === 'c' ? '' : attr ),
                  op2 + i + ( op2 === 'b' || op2 === 'c' ? '' : attr )
                ] );
              } );
          } );
          console.log(rules);
          const history = data.sections.map( section => section.steps.toString() );
          const random = Math.random() * 100;
          for ( const key in schedule.inputs )
            if ( random >= schedule.inputs[ key ] )
              section.solution = key;
          let repeats = 0;
          do {
            section.steps = this.toposort( $.shuffleArray( steps ), rules ).map( step => {
              if ( step[ 0 ] === 'o' )
                step += ( randomFromRange( 0, 1 ) ? '+' : '*' ) + randomFromRange(...this.operand);
              return step;
            } );
          } while ( ( history.includes( section.steps.toString() ) || getSolution( section ) !== section.solution ) && ++repeats <= 500 );
          if ( repeats > 500 && !data.total ) return this.start();
          section.solution = getSolution( section );
        }
        data.sections.push( section );
        this.html.render( this.html.main( this, this.section2table( section ) ), this.element );
        // this.html.render( this.html.inputs( this ), this.element.querySelector( '#inputs' ) );
        this.onchange && this.onchange( { event: 'next', instance: this } );
      };
      const getSolution = section => {
        switch ( section.solution ) {
          case 'consistence':
            return consistence();
          case 'legal':
            return consistence() && legal();
          case 'serializable':
            return consistence() && legal() && serializable();
          case 'conflict_serializable':
            return consistence() && legal() && conflictSerializable();
          default:
            return '';
        }
        function consistence() {
          const locked = [];
          section.steps.forEach( ( [ op, t, attr ] ) => {
            switch ( op ) {
              case 'l':
                locked[ attr ] = t;
                break;
              case 'u':
                delete locked[ attr ];
                break;
              case 'r':
              case 'o':
              case 'w':
                if ( locked[ attr ] !== t ) return false;
                break;
            }
          });
          return 'consistence';
        }
        function legal() {
          const locked = [];
          section.steps.forEach( ( [ op, t, attr ] ) => {
            switch ( op ) {
              case 'l':
                if ( locked[ attr ] && locked[ attr ] !== t ) return false;
                locked[ attr ] = t;
                break;
              case 'u':
                delete locked[ attr ];
                break;
            }
          });
          return 'legal';
        }
        function serializable() {
          let t__ = [];
          let t12 = [];
          let t21 = [];
          section.steps.forEach( step => {
            const [ op, nr ] = step;
            if ( op !== 'o' ) return;
            t__.push( step );
            t12[ nr - 1 ? 'push' : 'unshift' ]( step );
            t21[ nr - 1 ? 'unshift' : 'push' ]( step );
          } );
          t__ = solve( t__ );
          t12 = solve( t12 );
          t21 = solve( t21 );
          return ( t__.A === t12.A && t__.B === t12.B || t__.A === t21.A && t__.B === t21.B ) && 'serializable';
          function solve( steps ) {
            const db = { A: section.a, B: section.b };
            steps.forEach( step => db[ step[ 2 ] ] = step[ 3 ] === '+' ? db[ step[ 2 ] ] + parseInt( step[ 4 ] ) : db[ step[ 2 ] ] * step[ 4 ] );
            return db;
          }
        }
        function conflictSerializable() {
          const t = [ [], [] ];
          const steps = section.steps.filter( step => {
            const [ op, nr ] = step;
            switch ( op ) {
              case 'r':
              case 'w':
                t[ nr - 1 ].push( step );
                return true;
            }
          } );
          const t12 = [ ...t[ 0 ], ...t[ 1 ] ];
          const t21 = [ ...t[ 1 ], ...t[ 0 ] ];
          compare( t12 );
          return compare( t12 ) && compare( t21 );
          function compare( schedule ) {
            steps.forEach( ( step1, i1 ) => {
              const [ op, t1, attr1 ] = step1;
              if ( op !== 'w' ) return;
              const i2 = schedule.indexOf( step1 );
              steps.forEach( ( step2, j ) => {
                const [ _, t2, attr2 ] = step2;
                if ( t1 !== t2 && attr1 === attr2 ) {
                  if ( j < i1 && schedule.indexOf( step2 ) > i2 ) return false;
                  if ( j > i1 && schedule.indexOf( step2 ) < i2 ) return false;
                }
              } );
            } );
            return 'conflict_serializable';
          }
        }
      };
      this.section2table = section => {
        const t = [ { A: section.a, B: section.b }, {}, {} ];
        const values = section.steps.map( ( step, i ) => {
          let [ op, nr, attr, o, x ] = step;
          switch ( op ) {
            case 'r':
              t[ nr ][ attr ] = t[ 0 ][ attr ];
              break;
            case 'o':
              t[ nr ][ attr ] =
                o === '+' ? t[ nr ][ attr ] + parseInt( x ) : t[ nr ][ attr ] * x;
              break;
            case 'w':
              t[ 0 ][ attr ] = t[ nr ][ attr ];
              delete t[ nr ][ attr ];
              break;
          }
          op = this.ops[ op ];
          op = op
            .replaceAll( '{a}', attr?.toLowerCase() )
            .replaceAll( '{A}', attr )
            .replaceAll( '{o}', o )
            .replaceAll( '{x}', x );
          return [
            i + 1,
            nr == 1 ? op : '',
            nr == 2 ? op : '',
            t[ 0 ].A,
            t[ 1 ].A || '-',
            t[ 2 ].A || '-',
            t[ 0 ].B,
            t[ 1 ].B || '-',
            t[ 2 ].B || '-',
          ];
        });
        values.unshift( this.cols );
        return values;
      };
      this.getValue = () => $.clone( data );
      this.events = {
        /**
         * When an answer is clicked.
         * @function
         * @memberOf AppEvents
         */
        onAnswer: () => {
          /**
           * App state data of the current section.
           * @type {object}
           */
          const section = data.sections.at(-1);

          /**
           * Data used to generate the current schedule.
           * @type {object}
           */
          const schedule =
            this.schedules[data.sections.length - 1] || this.schedules;

          // Cancel if the app is not a trainer but only a generator or if the solution has already been revealed.
          if (!schedule.inputs || section.correct !== undefined) return;

          // Update the user's input in the current section's app status data.
          section.input = Object.values($.formData(this.element));

          // Update the HTML template for the input fields.
          this.html.render(
            this.html.inputs(this),
            this.element.querySelector("#inputs")
          );

          // Trigger the 'change' event due to user has chosen an answer.
          this.onchange && this.onchange({ event: "answer", instance: this });
        },

        /**
         * When the button to submit a solution is clicked.
         * @function
         * @memberOf AppEvents
         */
        onSubmit: () => {
          /**
           * App state data of the current section.
           * @type {object}
           */
          const section = data.sections.at(-1);

          /**
           * Data used to generate the current schedule.
           * @type {object}
           */
          const schedule =
            this.schedules[data.sections.length - 1] || this.schedules;

          // Cancel if the app is not a trainer but only a generator or if the solution has already been revealed or user input is still missing.
          if (
            !schedule.inputs ||
            section.correct !== undefined ||
            !section.input ||
            section.input.includes("")
          )
            return;

          // In the current section's app status data, add whether the user input matches the solution.
          section.points = 0;
          section.total = section.solution.length;
          for (let i = 0; i < section.total; i++)
            section.input[i] === section.solution[i] && section.points++;
          section.correct = section.points === section.total;
          section.correct && data.correct++;

          // Show Feedback? => Update the HTML template for the input fields, otherwise start next section.
          if (this.feedback || data.sections.length === data.total)
            this.html.render(
              this.html.inputs(this),
              this.element.querySelector("#inputs")
            );
          else this.next();

          // Trigger the 'change' event due to user input being submitted.
          this.onchange && this.onchange({ event: "submit", instance: this });
        },

        /**
         * When the button that starts the next section is clicked.
         * @function
         * @memberOf AppEvents
         */
        onNext: () => {
          /**
           * App state data of the current section.
           * @type {object}
           */
          const section = data.sections.at(-1);

          /**
           * Data used to generate the current schedule.
           * @type {object}
           */
          const schedule =
            this.schedules[data.sections.length - 1] || this.schedules;

          // Cancel if the app is not a trainer but only a generator and the solution has either not yet been revealed or it is the last round.
          if (
            !this.feedback ||
            (schedule.inputs &&
              (section.correct === undefined ||
                data.sections.length === data.total))
          )
            return;

          // Show the next section with another constellation of transaction steps.
          this.next();
        },

        /**
         * When the finish button is clicked.
         * @function
         * @memberOf AppEvents
         */
        onFinish: () => {
          // Cancel if there is no fixed number of sections, or it is not the last round or the solution has not yet been revealed.
          if (
            !data.total ||
            (!this.anytime_finish &&
              (data.sections.length < data.total ||
                data.sections.at(-1).correct === undefined))
          )
            return;

          // Trigger the 'finish' event.
          $.onFinish(this);
        },
      };
      const randomFromRange = ( min, max ) => Math.floor( Math.random() * ( max - min + 1 ) + min );
    }
  };
  let b="ccm."+component.name+(component.version?"-"+component.version.join("."):"")+".js";if(window.ccm&&null===window.ccm.files[b])return window.ccm.files[b]=component;(b=window.ccm&&window.ccm.components[component.name])&&b.ccm&&(component.ccm=b.ccm);"string"===typeof component.ccm&&(component.ccm={url:component.ccm});let c=(component.ccm.url.match(/(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/)||[""])[0];if(window.ccm&&window.ccm[c])window.ccm[c].component(component);else{var a=document.createElement("script");document.head.appendChild(a);component.ccm.integrity&&a.setAttribute("integrity",component.ccm.integrity);component.ccm.crossorigin&&a.setAttribute("crossorigin",component.ccm.crossorigin);a.onload=function(){(c="latest"?window.ccm:window.ccm[c]).component(component);document.head.removeChild(a)};a.src=component.ccm.url}
})();
