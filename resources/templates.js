/**
 * @overview HTML templates of <i>ccmjs</i>-based web component for 2PS Trainer.
 * @author André Kless <andre.kless@web.de> 2022-2023
 * @copyright EILD.nrw 2022-2023
 * @license The MIT License (MIT)
 */

import { html, render } from '../libs/lit/lit.js';
export { render };

/**
 * HTML templates of <i>ccmjs</i>-based web component for Anomaly Trainer.
 * @module HTMLTemplates
 */

/**
 * Returns the main HTML template.
 * @function
 * @param {object} app - App instance
 * @param {[[number,string,string,number,number|string,number|string]]} values - Table values
 * @returns {TemplateResult}
 */
export function main( app, values ) {
  const col_heads = values.shift();
  return html`
    <header>
      <h1 ?data-hidden=${ !app.text.title }>${ app.text.title }</h1>
      <p class="lead" ?data-hidden=${ !app.text.task }>${ app.text.task }</p>
    </header>
    <main>
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            ${ col_heads.map( col => html`<th scope="col">${ col }</th>` ) }
          </tr>
        </thead>
        <tbody class="table-group-divider">
          ${ values.map( row => html`
            <tr>
              ${ row.map( ( cell, i ) => i ? html`<td>${ cell }</td>` : html`<th scope="row">${ cell }</th>` ) }
            </tr>
          ` ) }
        </tbody>
      </table>
      <div id="inputs"></div>
    </main>
    
    <!-- Lizenzen -->
    <aside class="bg-light rounded text-center form-text mt-4 mx-3">
      Der <a href="https://github.com/eild-nrw/2ps_trainer" target="_blank">2PS-Trainer</a> wurde
      von <a href="https://h-brs.de/de/inf/andre-kless" target="_blank">André Kless</a> im Rahmen
      des <a href="https://github.com/EILD-nrw" target="_blank">EILD-Projekts</a> an
      der <a href="https://h-brs.de" target="_blank">Hochschule Bonn-Rhein-Sieg</a> entwickelt.
      Dieser interaktive Trainer enthält Software unter <a href="https://opensource.org/licenses/MIT" target="_blank">MIT-Lizenz</a> und Content
      unter der <a href="https://creativecommons.org/publicdomain/zero/1.0/deed.de" target="_blank">CC0-Lizenz</a>.
    </aside>

    <!-- Logos -->
    <aside class="mt-5 text-center">
      <hr>
      <img src="./resources/img/logos/logos.jpg" alt="Logos">
    </aside>
  `;
}

/**
 * Returns the HTML template for inputs and buttons.
 * @function
 * @param {object} app - App instance
 * @returns {TemplateResult}
 */
export function inputs( app ) {
  const data = app.getValue();
  const current_section = data.sections.at( -1 );
  const schedule = app.schedules[ data.sections.length - 1 ] || app.schedules;
  const rounds = schedule.rounds || app.schedules.length;
  const sections = rounds ? data.sections.concat( Array( rounds - data.sections.length ).fill( null ) ) : data.sections;
  const show_solution = current_section.correct !== undefined;
  return html`
    <div class="d-flex justify-content-between align-items-end flex-wrap">
      <div class="d-flex flex-wrap" ?data-hidden=${ !schedule.inputs }>
        ${ schedule.inputs?.map( ( input, i ) => html`
          <div class="m-3">
            <div class="label">${ input.label }</div>
            <div class="d-flex align-items-center">
              <div class="btn-group btn-group-sm" role="group">
                <input type="radio" class="btn-check" name="answer-${ i }" value="true" id="yes-${ i }" autocomplete="off" .checked=${ current_section.input && current_section.input[ i ] === true } ?disabled=${ show_solution } @change=${ app.events.onAnswer }>
                <label class="btn btn-outline-success" for="yes-${ i }">${ app.text.yes }</label>
                <input type="radio" class="btn-check middle" name="answer-${ i }" value="" id="neither-${ i }" autocomplete="off" .checked=${ !current_section.input || typeof current_section.input[ i ] !== 'boolean' } ?disabled=${ show_solution } @change=${ app.events.onAnswer }>
                <label class="btn btn-outline-secondary" for="neither-${ i }">${ app.text.neither }</label>
                <input type="radio" class="btn-check" name="answer-${ i }" value="false" id="no-${ i }" autocomplete="off" .checked=${ current_section.input && current_section.input[ i ] === false } ?disabled=${ show_solution } @change=${ app.events.onAnswer }>
                <label class="btn btn-outline-danger" for="no-${ i }">${ app.text.no }</label>
              </div>
              <div class="ms-2 d-flex align-items-center" ?data-invisible=${ !show_solution || !app.feedback }>
                ${ app.feedback ? ( show_solution && current_section.input[ i ] === current_section.solution[ i ] ? html`
                  <svg height="24" fill="currentColor" class="text-success" viewBox="0 0 16 16">
                    <path d="M13.485 1.431a1.473 1.473 0 0 1 2.104 2.062l-7.84 9.801a1.473 1.473 0 0 1-2.12.04L.431 8.138a1.473 1.473 0 0 1 2.084-2.083l4.111 4.112 6.82-8.69a.486.486 0 0 1 .04-.045z"/>
                  </svg>
                ` : html`
                  <svg height="24" fill="currentColor" class="text-danger" viewBox="0 0 16 16">
                    <path d="M1.293 1.293a1 1 0 0 1 1.414 0L8 6.586l5.293-5.293a1 1 0 1 1 1.414 1.414L9.414 8l5.293 5.293a1 1 0 0 1-1.414 1.414L8 9.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L6.586 8 1.293 2.707a1 1 0 0 1 0-1.414z"/>
                  </svg>
                ` ) : '' }
              </div>
            </div>
          </div>
        ` ) }
      </div>
      <div id="progress" class="d-flex flex-grow-1 m-3 border border-info rounded-pill bg-info overflow-hidden" ?data-hidden=${ !data.total } ?data-invisible=${ sections[ 0 ].correct === undefined }>
        ${ sections.map( section => html`
          <div class="flex-grow-1 d-flex rounded bg-light">
            ${ Array( section?.total || 1 ).fill( null ).map( ( _, i ) => html`
              <div class="flex-grow-1 ${ section?.correct !== undefined ? ( app.feedback ? ( section.input[ i ] === section.solution[ i ] ? 'bg-success' : 'bg-danger' ) : 'bg-info' ) : ( section && !section.solution && section !== current_section ? 'bg-info' : '' ) } d-flex justify-content-center align-items-center text-info">
                <div ?data-invisible=${ !section || section.correct === undefined || !app.feedback || !section.solution[ i ] }>•</div>
              </div>
            ` ) }
          </div>
        ` ) }
      </div>
      <div class="m-3">
        <button type="button" class="btn btn-primary" ?disabled=${ show_solution || !current_section.input || current_section.input.includes( '' ) } ?data-hidden=${ !schedule.inputs } @click=${ app.events.onSubmit }>${ app.text.submit }</button>
        <button type="button" class="btn btn-primary" ?disabled=${ schedule.inputs && ( !show_solution || data.sections.length === data.total ) } ?data-hidden=${ !app.feedback } @click=${ app.events.onNext }>${ app.text.next }</button>
        <button type="button" class="btn btn-primary" ?disabled=${ !app.anytime_finish && ( data.sections.length < data.total || !show_solution ) } ?data-hidden=${ !data.total } @click=${ app.events.onFinish }>${ app.text.finish }</button>
      </div>
    </div>
  `;
}
