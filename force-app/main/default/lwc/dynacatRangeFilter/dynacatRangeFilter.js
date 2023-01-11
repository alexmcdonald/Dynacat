/*
 * dynacatRangeFilter LWC renders a two-ended range slider that can be used with any number / currency / percent fields.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

import { LightningElement, api, track } from 'lwc';

export default class DynacatRangeFilter extends LightningElement {

    @api xid;
    @api label;
    @track value;
    @api min;
    @api max;
    @api level;
    @api type;
    arialevel;
    maxLength;

    rendered=false;

    startSlider;
    finishSlider;
    startInput;
    finishInput;

    sliderColor = '#ECEBEA';
    rangeColor = 'rgba(21, 137, 238, 0.4)';

    sendEvent(handle, value) {

        const rangeChange = this.dispatchEvent(new CustomEvent('rangechange', {
            detail: {
                root: this.xid, handle: handle, value: value, type: this.type
            }
        }));
    }

    handleClear(event) {
        this.startSlider.value = this.min;
        this.finishSlider.value = this.max;
        this.controlStartSlider(false);
        this.controlFinishSlider(false);
        const ev1 = this.dispatchEvent(new CustomEvent('rangechange', {
            detail: {
                root: this.xid, handle: 'start', value: null, type: this.type
            }
        }));
        const ev2 = this.dispatchEvent(new CustomEvent('rangechange', {
            detail: {
                root: this.xid, handle: 'finish', value: null, type: this.type
            }
        }));
    }


    controlStartInput() {
      const [start, finish] = this.getParsed(this.startInput, this.finishInput);
        this.fillSlider(this.startInput, this.finishInput);
        if (start > finish) {
            this.startSlider.value = finish;
            this.startInput.value = finish;
        } else {
          this.startSlider.value = start;
        }
        this.sendEvent('start',this.startInput.value);
    }
        
    controlFinishInput() {
        const [start, finish] = this.getParsed(this.startInput, this.finishInput);
        this.fillSlider(this.startInput, this.finishInput);
        this.setToggleAccessible(this.finishInput);
        if (start <= finish) {
            this.finishSlider.value = finish;
            this.finishInput.value = finish;
        } else {
            this.finishInput.value = start;
        }
        this.sendEvent('finish',this.finishInput.value);
    }
    
    controlStartSlider(sendEvent) {
      const [start, finish] = this.getParsed(this.startSlider, this.finishSlider);
      this.fillSlider(this.startSlider, this.finishSlider);
      if (start > finish) {
        this.startSlider.value = finish;
        this.startInput.value = finish;
      } else {
        this.startInput.value = start;
      }
      if(sendEvent) this.sendEvent('start',this.startInput.value);
    }
    
    controlFinishSlider(sendEvent) {
      const [start, finish] = this.getParsed(this.startSlider, this.finishSlider);
      this.fillSlider(this.startSlider, this.finishSlider);
      this.setToggleAccessible(this.finishSlider);
      if (start <= finish) {
        this.finishSlider.value = finish;
        this.finishInput.value = finish;
      } else {
        this.finishInput.value = start;
        this.finishSlider.value = start;
      }
      if(sendEvent) this.sendEvent('finish',this.finishInput.value);
    }
    
    getParsed(currentFrom, currentTo) {
      const start = parseInt(currentFrom.value, 10);
      const finish = parseInt(currentTo.value, 10);
      return [start, finish];
    }
    
    fillSlider(start, finish) {
        const rangeDistance = finish.max - finish.min;
        const startPosition = start.value - finish.min;
        const finishPosition = finish.value - finish.min;
        this.finishSlider.style.background = `linear-gradient(
          to right,
          ${this.sliderColor} 0%,
          ${this.sliderColor} ${(startPosition)/(rangeDistance)*100}%,
          ${this.rangeColor} ${((startPosition)/(rangeDistance))*100}%,
          ${this.rangeColor} ${(finishPosition)/(rangeDistance)*100}%, 
          ${this.sliderColor} ${(finishPosition)/(rangeDistance)*100}%, 
          ${this.sliderColor} 100%)`;
    }
    
    setToggleAccessible(currentTarget) {
      if (Number(currentTarget.value) <= 0 ) {
        this.finishSlider.style.zIndex = 2;
      } else {
        this.finishSlider.style.zIndex = 0;
      }
    }

    handleSliderChange(event) {
      const slider = event.target.dataset.id;
      if(slider=="startslider") this.controlStartSlider(true);
      else this.controlFinishSlider(true);      
    }

    handleInputChange(event) {
      const input = event.target.dataset.id;
      if(input=="startinput") this.controlStartInput();
      else this.controlFinishInput();    
    }

    renderedCallback() {
        
        if(!this.rendered && this.template.querySelector("[data-id='startslider']")) {
            this.rendered=true;

            this.startSlider = this.template.querySelector("[data-id='startslider']");
            this.finishSlider = this.template.querySelector("[data-id='finishslider']");
            this.startInput = this.template.querySelector("[data-id='startinput']");
            this.finishInput = this.template.querySelector("[data-id='finishinput']");
    
            this.fillSlider(this.startSlider, this.finishSlider);
            this.setToggleAccessible(this.finishSlider);
        }
    }
    

    connectedCallback() {
        this.arialevel = this.level + 1;  
        this.maxLength = String(this.max).length;
    }
}