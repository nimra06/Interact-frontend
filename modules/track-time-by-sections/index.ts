import Module from "../module";
import SectionTrackTime from "./section-track-time";

export default class TrackTimeBySections extends Module {
    sections: Array<SectionTrackTime> = []
    interval: NodeJS.Timer
    domContentLoadedEventListener: EventListener

    start(): void {
        this.setTrackTimeInterval();
    }

    onSendData(data): void {
        data.sections = [];
        this.stopTimers();
        this.sections.forEach(section => {
            data.sections.push({
                nm: section.name,
                ts: section.time_spent,
            });
        });
        this.sections = [];
    }

    onUserInactive(): void {
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.sections.filter(section => section.tracking === true)
            .forEach(section => {
                section.tracking = false;
                section.time_start = null;
                section.time_spent = 0;
            });
    }

    onUserReactive(): void {
        this.setTrackTimeInterval();
    }

    setTrackTimeInterval(): void {
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.interval = setInterval(() => this.trackTime(), 100);
    }

    trackTime(): void {
        let visibleSection: Element = null;
        let maxPercentage = 0;
        document.querySelectorAll('section.ss').forEach(el => {
            const currentPercentage = this.getViewPercentage(el);
            if (currentPercentage > maxPercentage) {
              maxPercentage = currentPercentage;
              visibleSection = el;
            }
        });
        if (!visibleSection) {
            // Stop timers for all sections
            this.stopTimers();
            return;
        } else {
            const visiblePercentage = this.getViewPercentage(visibleSection);
            if (visiblePercentage < 40) {
                this.stopTimers();
                return;
            }
        }

        const sectionId = visibleSection.getAttribute('id');
        // Stop any timer on non-visible sections
        this.sections.filter(section => section.id !== sectionId && section.tracking === true)
            .forEach(section => {
                section.tracking = false;
                section.time_spent += (performance.now() - section.time_start);
                section.time_start = null;
            });
        
        let sectionTrackTime = this.sections.find(section => section.id === sectionId);
        if (!sectionTrackTime) {
            sectionTrackTime = new SectionTrackTime();
            sectionTrackTime.id = sectionId;
            sectionTrackTime.name = visibleSection.getAttribute('data-section');
            this.sections.push(sectionTrackTime);
        }
        sectionTrackTime.tracking = true;
        if (!sectionTrackTime.time_start) {
            sectionTrackTime.time_start = performance.now();
        } else {
            sectionTrackTime.time_spent += (performance.now() - sectionTrackTime.time_start);
            sectionTrackTime.time_start = performance.now();
        }
    }

    stopTimers() {
        this.sections.filter(section => section.tracking === true)
            .forEach(section => {
                section.tracking = false;
                section.time_spent += (performance.now() - section.time_start);
                section.time_start = null;
            });
    }

    getViewPercentage(element): number {
        const viewport = {
            top: window.pageYOffset,
            bottom: window.pageYOffset + window.innerHeight
        };
      
        const elementBoundingRect = element.getBoundingClientRect();
        const elementPos = {
            top: elementBoundingRect.y + window.pageYOffset,
            bottom: elementBoundingRect.y + elementBoundingRect.height + window.pageYOffset
        };
      
        if (viewport.top > elementPos.bottom || viewport.bottom < elementPos.top) {
            return 0;
        }
      
        // Element is fully within viewport
        if (viewport.top < elementPos.top && viewport.bottom > elementPos.bottom) {
            return 100;
        }
      
        // Element is bigger than the viewport
        if (elementPos.top < viewport.top && elementPos.bottom > viewport.bottom) {
            return 100;
        }
      
        const elementHeight = elementBoundingRect.height;
        let elementHeightInView = elementHeight;
      
        if (elementPos.top < viewport.top) {
            elementHeightInView = elementHeight - (window.pageYOffset - elementPos.top);
        }
      
        if (elementPos.bottom > viewport.bottom) {
            elementHeightInView = elementHeightInView - (elementPos.bottom - viewport.bottom);
        }
      
        const percentageInView = (elementHeightInView / window.innerHeight) * 100;
      
        return Math.round(percentageInView);
    }
}