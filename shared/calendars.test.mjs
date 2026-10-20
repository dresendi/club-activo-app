import {test} from "node:test";
import assert from "node:assert/strict";
import {calendarEmbedUrl} from "./calendars.js";
test("calendar URLs must be Google HTTPS embed URLs",()=>{
  const url="https://calendar.google.com/calendar/embed?src=test&ctz=America%2FMexico_City";
  assert.equal(calendarEmbedUrl(url),url);
  for(const value of [undefined,"",'<iframe src="'+url+'"></iframe>',"http://calendar.google.com/calendar/embed","https://calendar.google.com.evil.example/calendar/embed","javascript:alert(1)"])
    assert.equal(calendarEmbedUrl(value),null);
});
