if (foswiki.FullCalendar == undefined) {

foswiki.FullCalendar = function($){
var oproot, calselect = '', typeselect = '',
	startTime = 9, eventDuration = 2; // default event time 9am-11am
function getForm(web,topic,type,async) {
	if (!web) [web, topic] = topic.split(/\./);
	if (this.$form && this.eventTypeElements[web+type]) {
		setForm(web+type);
		return;
	}
	var formData = {
		topic: web+'.'+topic,
		eventForm: this.$form ? 0 : 1,
		eventType: type,
		asobject: 1
	};
	foswiki.HijaxPlugin.serverAction({
		type: "GET",
		async: async ? async : false,
		loading: false,
		nooverlay: true,
		url: foswiki.scriptUrl+'/rest/FullCalendarPlugin/form',
		data: formData,
		success: function(json){
			if (json.eventForm) {
				initForm(json.eventForm);
				delete json.eventForm;
			}
			cacheType(web+type, json);
			setForm(web+type);
		}
	});
}
function cacheType(webtype, json) {
	if  (typeof this.eventTypeElements == 'undefined') this.eventTypeElements = [];
	this.eventTypeElements[webtype] = json;
}
function setData(label, data) {
	this.$form.data(label,data);
}
function removeData(label) {
	var data = this.$form.data(label);
	this.$form.removeData(label);
	return data;
}
function setForm(webtype) {
	if (this.$form.data('calselect') != calselect) {
		this.$formTopic.html(calselect);
		this.$form.data('calselect',calselect);
	}
	if (this.$form.data('typeselect') != typeselect) {
		this.$formType.html(typeselect);
		this.$form.data('typeselect',typeselect);
	}
	if (this.$formElements.data('type') != webtype) {
		this.$formElements.html(this.eventTypeElements[webtype].elements);
		this.$formType.val(this.eventTypeElements[webtype].type);
		this.$formElements.data('type',webtype);
	}
}
function initForm(html) {
	var self = this;
	$.datepicker.setDefaults($.datepicker.regional['']);
	this.$form = $('<div>'+html+'</div>').find('#newCalEvent').dialog({
		autoOpen: false,
		show: 'blind',
		height: 'auto',
		width: 'auto',
		resizable: false,
		dialogClass: 'foswikiFormSteps',
		title: 'Create, Edit a calendar event'
	});
	this.$form.bind( "dialogclose", function(event, ui) {
		cancelForm(false); // false = don't trigger the .dialog('close')
	});
	
	this.$formType = $('#fcp_type');
	this.$formTopic = $('#fcp_topic');
	$(this.$formTopic).add(this.$formType).change(function(){
		getForm('',self.$formTopic.val(),self.$formType.val());
	});
	
	oproot = foswiki.scriptUrl+'/rest/ObjectPlugin/';
	var $apptDateClass = $(".appt_date").attr("disabled","disabled");
	this.$formElements = $('#eventFormElements');
	this.$form.find(".isodate").datepicker({'dateFormat':'d M yy','changeMonth':true,'changeYear':true});
	$('#appt_startDate').datepicker('option','onClose',function(dateText,inst){
        var s = $.datepicker.parseDate('d M yy',dateText);
        var $end = $('#appt_endDate');
        var e = $.datepicker.parseDate('d M yy',$end.val());
        if (e < s) $end.val(dateText);
    });

	resetForm();

	$('#appt_range_date').click(function(){
		$('#appt_range_by').trigger('click');
	});

	this.$recur = $("#appt_recur").click(function(){
		if ($(this).is(':checked')) {
			$('#recur_data').show();
		} else {
			$('#recur_data').hide();
		}
	});

	this.$allday = $("#appt_allDay").click(function(){
		if ($(this).is(':checked')) {
			self.$form.find('.fcp_timeperiod').hide();
		} else {
			self.$form.find('.fcp_timeperiod').show();
		}
	});

	var $everyunit = $('#appt_every_unit');

	this.$recursb = $('#appt_recur_switchboard').click(function(e){
		var $target = $(e.target);
		$everyunit.text($target.attr("unit"));
		var repeater = $target.val();
		$('.appt_recur_form').hide();
		var start = $.datepicker.parseDate('d M yy',$('#appt_startDate').val());
		switch (repeater) {
			case "D":
				break;
			case "Wdow":
				$('#appt_form_day').show().find('.wdow').attr('checked',false);
				$('#appt_dow_' + start.getDay()).attr('checked',true);
				break;
			default:
				$('#appt_form_date').show();
				var day = start.getDay();
				day = day ? day : 7; // in js Sun = 0 but want Sun = 7
				$('#appt_day_n').val(Math.ceil(start.getDate() / 7));
				$('#appt_day_d').val(day);
				if (repeater == 'YM') {
					$('#appt_form_month').show();
					$('#appt_month').val(start.getMonth() + 1);
				}
				break;
		}
	});

	$("input[name='appt_daydate']").click(function() {
		var thisValue = $(this).val();
		if (thisValue == "ndow") {
			$apptDateClass.attr("disabled","");
		} else {
			$apptDateClass.attr("disabled","disabled");
		}
	});

	$('#appt_form_cancel').click(function(){
		cancelForm(true);
		return false;
	});

	$('#appt_form_submit').click(function(){
		// create a new event
		foswiki.HijaxPlugin.serverAction({
			url: oproot+'new',
			data: foswiki.FullCalendar.eventAsObject(),
			success: function(){
				// ...and...
				foswiki.FullCalendar.refetchEvents();
			}
		});
		return false;
	});

	this.$change = $('#recur_event_change').click(function(e){
		var dateformat = 'd MMM yyyy';
		var date;
		var $target = $(e.target);
		var val = $target.val();
		switch (val) {
			case "only":
				break;
//			case "fromhere":
//				break;
//			case "all":
//				date = $.fullCalendar.formatDate(this.$form.data('startDate'), dateformat);
//				$startDate.val(date);
//				break;
			default:
				self.$recur.attr('checked',true);
				$('#recur_data').show();
		}
	});

	$('#appt_form_update').click(function(){
		return updateEvent('save');
	});

	$('#appt_form_delete').click(function(){
		return updateEvent('delete');
	});
}
function cancelForm(closedialog) {
	if (closedialog) this.$form.dialog('close');
    this.$form.get(0).reset();
	this.$form.find('input[id^=fcp_]').val('');
    $('#recur_data').find('.urlParam').removeClass('urlParam');
    $('#appt_form_cancel').unbind('click.revert');
	$('#fcp_reltopic').val('');
    resetForm();
	this.$formTopic.attr('disabled',false);
	$('body').trigger('fcpCancelForm'); // trigger event type-specific actions
	this.$form.removeData('event');
}
function resetForm() {
    $("#recur_data").find('.appt_recur_form').andSelf().hide();
    $("#appt_recur").attr("checked",false);
	
    $(".fcp_timeperiod").show();
    $("#appt_allDay").attr("checked",false);

    $('#appt_form_submit').show();
    $('#recur_switch').show();

    $('#calEventUpdate').hide();
    $('#recur_event_change').hide();
}
function getEvent(event,func) {
	var startSecs = Math.floor(event.start.getTime()/1000);
	var d = new Date();
	var tzoffset = -d.getTimezoneOffset() * 60;  // ugly handling of local tz, is there better?
	startSecs += tzoffset; 
	var endSecs = startSecs + (60*60*24) + 1; // + 1 day & 1 sec
	foswiki.HijaxPlugin.serverAction({
		type: "GET",
		async: false,
		url: foswiki.scriptUrl+'/rest/FullCalendarPlugin/edit',
		data: {
			topic: event.web+'.'+event.topic,
            uid: event.uid,
            start: startSecs,
            end: endSecs,
            asobject: 1
        },
		success: function(gotEvent) {
			gotEvent.start = $.fullCalendar.parseISO8601(gotEvent.start,1); // ignoring Timezone
			gotEvent.end = $.fullCalendar.parseISO8601(gotEvent.end,1);
			func(gotEvent);
		}
	});
}
function updateEvent(action) {
	// when updating an event, topic and uid must not change
	var eventData = this.$form.data('event');
	var upData = {
					topic: eventData.web+'.'+eventData.topic,
					asobject: 1,
					uid: eventData.uid
				};
	// make sure topic is what it should be because new events that are created as
	// a result of updating existing events should be created on the same calendar (i.e. web.topic)
	this.$formTopic.val(upData.topic);  
	var rchange = this.$change.is(':visible') ? this.$change.find('input[name="recur_change"]:checked').val() : '';
	switch (rchange) {
		case "only":
			var event;
			var exception = $('#fcp_exceptions').val();
			if (action == 'save') {
				// create new event...
				foswiki.HijaxPlugin.serverAction({
					url: oproot+'new',
					exception: exception,
					upData: upData,
					data: $.extend(foswiki.FullCalendar.eventAsObject(),{topic:upData.topic}),
					success: function(event){
						// ...and...
						foswiki.FullCalendar.addEventException(this.upData, this.exception+':'+event.uid);
					}
				});
			} else {
				foswiki.FullCalendar.addEventException(upData, exception+':deleted');
			}
			break;
		case "fromhere":
			// update rangeEnd
			var actionData = $.extend({},upData,{
				rangeEnd: $.fullCalendar
					.formatDate($.datepicker.parseDate('d M yy',$('#appt_startDate').val()), 'yyyy-MM-dd')
			});
			foswiki.HijaxPlugin.serverAction({
				url: oproot+'save',
				root: oproot,
				action: action,
				data: actionData,
				success: function(){
					if (this.action != 'delete') {
						// create new event
						foswiki.HijaxPlugin.serverAction({
							url: this.root+'new',
							data: foswiki.FullCalendar.eventAsObject(),
							success: function(){
								// ...and...
								foswiki.FullCalendar.refetchEvents();
							}
						});
					}
				}
			});
			break;
		default: // all or ''
			// update original event record
			var actionData;
			if (action == 'save') {
				actionData = $.extend(foswiki.FullCalendar.eventAsObject(),upData);
			} else { // delete
				actionData = upData;
			}
			foswiki.HijaxPlugin.serverAction({
				url: oproot+action,
				data: actionData,
				success: function(){
					foswiki.FullCalendar.refetchEvents();
				}
			});
			break;
	}
	return false;
}
function me() {
	return this;
}
return {
setAllDay : function() {
    me().$allday.attr('checked',true);
    $('#newCalEvent .fcp_timeperiod').hide();
},
unsetRecur : function() {
	$('#recur_data').hide();
	me().$recur.attr('checked',false);
},
resetUserList : function() {
	$("#appt_users").each(function(){
		if ($(this).attr('resetmultiple')) {
			var size = $(this).attr('resetmultiple');
			$(this).attr({'multiple':true,'size':size});
		}
	});
},
eventAsObject : function() {
	$('#recur_data').find('.urlParam').removeClass('urlParam');
	if ($('#appt_recur').is(':checked')) {
		$('#appt_every').addClass('urlParam');
			var repeater = me().$recursb.find('input[name="appt_recur_type"]:checked').val();
		switch (repeater) {
			case "D":
				break;
			case "Wdow":
				$('#appt_form_day input').addClass('urlParam');
				break;
			default:
				var daydate = $('#appt_form_date input[name="appt_daydate"]:checked').val();
				repeater = repeater + daydate;
				if (daydate == 'ndow') $('#ndow .ndow').addClass('urlParam');
				break;
		}
		$('#fcp_repeater').val(repeater);
		if ($('#appt_recur_range_fieldset input[name="appt_range"]:checked').val() == 'by') {
            var range = $.datepicker.parseDate('d M yy',$('#appt_range_date').val());
            $('#fcp_rangeEnd').val($.fullCalendar.formatDate(range, 'yyyy-MM-dd'));
		}
	}
	var start = $.datepicker.parseDate('d M yy',$('#appt_startDate').val());
	$('#fcp_startDate').val($.fullCalendar.formatDate(start, 'yyyy-MM-dd'));
	var end = $.datepicker.parseDate('d M yy',$('#appt_endDate').val());
	var diff = end.getTime() - start.getTime();
	$('#fcp_durationDays').val(diff/86400000);
    var stime, etime;
    if (!self.$allday.is(':checked')) {
        stime = $('#appt_startTime').val();
        etime = $('#appt_endTime').val();
        $('#fcp_allDay').val("0");
	} else {
		stime = etime = '00:00:00';
		$('#fcp_allDay').val("1");
	}
	$('#fcp_startTime').val(stime);
	$('#fcp_endTime').val(etime);
	$('body').trigger('fcpEventAsObject'); // trigger event type-specific actions
	return foswiki.HijaxPlugin.asObject(me().$form.find('.urlParam')
		.add('<input name="asobject" value="1">'));
},
loadForm : function(event) {
	var self = me();
	getForm(event.web,event.topic,event.type,false); // get the form synchronously
	$('body').trigger('fcpLoadForm',[event]); // trigger event type-specific actions
	var dateformat = 'd MMM yyyy-HH:mm:ss';
	var dateStr = $.fullCalendar.formatDate(event.start, dateformat);
	var dateArray = dateStr.split('-');
	$startDate = $('#appt_startDate').val(dateArray[0]);
	$('#appt_startTime').val(dateArray[1]);
	dateStr = $.fullCalendar.formatDate(event.end, dateformat)
	dateArray = dateStr.split('-');
	$endDate = $('#appt_endDate').val(dateArray[0]);
	$('#appt_endTime').val(dateArray[1]);
	if (event.allDay) {
		self.$allday.attr('checked',true);
		self.$form.find('select.fcp_timeperiod').hide();
	}
	// $('#fcp_uid').val(event.uid);
	if (event.uid) {
		var topic = event.web+'.'+event.topic;
		self.$formTopic.val(topic).attr('disabled',true);
		self.$formType.val(event.type);
		if (self.$formType.val() != event.type) {
			$('<option selected>'+event.type+'</option>').appendTo(self.$formType);
		}
		$('#appt_form_submit').hide();  // editing an existing event
	}
	$('#fcp_reltopic').val(event.reltopic);
	if (event.editable) $('#calEventUpdate').show();
	if (event.repeater) {
		$('#recur_event_change').show();
		$('#recur_data').find('.urlParam').removeClass('urlParam');
		$('#appt_every').val(event.every);
		var repeater = event.repeater;
		switch (repeater) {
			case "D":
				break;
			case "Wdow":
				$('#appt_recur_weekly').trigger('click');
				$('#appt_form_day input.wdow').val(event.dow);
				//alert(event.dow);
				break;
			default:
				var yearmonth = repeater.split('M'); //
				if (yearmonth[0] == 'Y') {
					$('#appt_recur_yearly').trigger('click');
				} else {
					$('#appt_recur_monthly').trigger('click');
				}
				if (yearmonth[1] == 'dd') {
					$('#appt_on_date').trigger('click');
				} else {
					$('#appt_monthly_day').trigger('click');
				}
				break;
		}
		if (event.rangeEnd) {
			$('#appt_range_by').attr('checked',true);
			var range = $.fullCalendar.parseISO8601(event.rangeEnd);
			$('#appt_range_date').val($.fullCalendar.formatDate(range, 'd MMM yyyy'));
		}
		if (event.exceptions) event.exceptions += ',';
		else event.exceptions = '';
		$('#fcp_exceptions').val(event.exceptions + $.fullCalendar.formatDate(event.start, 'yyyy-MM-dd'));
	}
	self.$form.data('event',event);
	self.$form.dialog('open').dialog('moveToTop');
},
refetchEvents : function() {
	cancelForm(true);
	var calendar = removeData('calendar');
	$(calendar).fullCalendar('refetchEvents');
},
addEventException : function(upData, exception) {
	$.extend(upData,{exceptions: exception});
	foswiki.HijaxPlugin.serverAction({
		url: oproot+'save',
		data: upData,
		success: function(){
			foswiki.FullCalendar.refetchEvents();
		}
	});
},
init : function(cal,web,topic,type,calendartopic,reltopic,viewall) {
	var self = this;
	var calendars = calendartopic.split(/[,]/),
		types = type.split(/[\s,]/);
	$.each(calendars, function(index, value){
		if (!value) return true;  // next
		calselect = calselect + '<option>'+value+'</option>';
	});
	$.each(types, function(index, value){
		if (!value) return true;  // next
		typeselect = typeselect + '<option>'+value+'</option>';
	});
	getForm(web,topic,types[0],true);
    $(cal).mouseup(function(){
		setData('calendar',this);
		setForm(web+types[0]);
	}).fullCalendar({
        theme: true,
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay'
        },
        editable: true, 
        columnFormat: {
			week: 'ddd d/M',
			day: 'dddd d/M'
		},
        timeFormat: 'HH:mm',    // uppercase H for 24-hour clock - alt: h(:mm)t
        events: function(start, end, reportEventsAndPop) {
			foswiki.HijaxPlugin.serverAction({
				url: foswiki.scriptUrl+'/rest/FullCalendarPlugin/events',
				type: 'GET',
				async: true,
				data: {  // our feed expects UNIX timestamps in seconds
					start: Math.round(start.getTime() / 1000),
					end: Math.round(end.getTime() / 1000),
					topic: web+'.'+topic,
					calendartopic: calendartopic,
					reltopic: viewall ? '' : reltopic,
					asobject: 1
				},
				success: function(json) {
					reportEventsAndPop(json); // function provided by $.fullcalendar to display the events
					// $.each(json,function(i,event){
						// TODO: populate an agenda list with the events
					// });
				}
			});
		},
        eventDrop: function(event,dayDelta,minuteDelta,allDay,revertFunc,jsEvent,ui,view) {
            if (dayDelta || minuteDelta || (allDay && view.name != 'month')) {
				// because FullCalendar adds the deltas after a drop and we want the original startdate
				var myEvent = {}; // copy the event object cos FC uses it in the revertFunc()
				myEvent.start = new Date();
				dayDelta = dayDelta * 24 * 60 * 60 * 1000;
				minuteDelta = minuteDelta * 60 * 1000;
				myEvent.start.setTime(event.start.getTime() - dayDelta);
				myEvent.start.setTime(myEvent.start.getTime() - minuteDelta);
				myEvent.uid = event.uid;
				myEvent.web = event.web;
				myEvent.topic = event.topic;
                getEvent(myEvent, function(gotEvent){ 
					if (allDay && view.name != 'month') {
						gotEvent.allDay = 1;
					}
					// reminder to self: we're setting END here not START!!!
					gotEvent.end.setTime(gotEvent.end.getTime() + dayDelta);
					gotEvent.end.setTime(gotEvent.end.getTime() + minuteDelta);
					// SMELL: ugly but done like this so that the exception field gets properly set in loadForm
                    foswiki.FullCalendar.loadForm(gotEvent);
					var dateStr = $.fullCalendar.formatDate(event.start, 'd MMM yyyy-HH:mm:ss')
					var dateArray = dateStr.split('-');
					$('#appt_startDate').val(dateArray[0]);
					$('#appt_startTime').val(dateArray[1]);
					// ENDSMELL
                });
				$('#appt_form_cancel').bind('click.revert',revertFunc());
            }
        },
        eventResize: function(event,dayDelta,minuteDelta,revertFunc) {
            if (dayDelta || minuteDelta) {
                getEvent(event, function(myEvent){
                    myEvent.end.setDate(myEvent.end.getDate() + dayDelta);
                    myEvent.end.setMinutes(myEvent.end.getMinutes() + minuteDelta);
                    foswiki.FullCalendar.loadForm(myEvent);
                });
				$('#appt_form_cancel').bind('click.revert',revertFunc());
            }
        },
        dayClick: function(date, allDay, jsEvent, view) {
			var event = {
				start: date,
				allDay: false,
				reltopic: reltopic,
				type: types[0],
				web: web,
				topic: topic
			};
            event.end = new Date(date);
            if (view.name != 'month') {
				if (allDay) {
					event.allDay = true;
				} else {
					event.end.setHours(event.end.getHours() + eventDuration);
				}
			} else {
				event.start.setHours(startTime);
				event.end.setHours(startTime+eventDuration);
			}
			foswiki.FullCalendar.loadForm(event);
        },
        eventClick: function(calEvent, jsEvent, view) {
            switch (calEvent.category) {
				case 'action':
					foswiki.HijaxPlugin.showOops("<h2>Action Tracker integration is ongoing</h2>\
Please use the Action Tracker interface available via the toolbar or visit the WebActions page.\n\n" + 
calEvent.text);
					break;
				case 'external':
					var dateformat = 'd MMM yyyy @ HH:mm:ss';
					var start = $.fullCalendar.formatDate(calEvent.start, dateformat);
					var message = "<h2>"+calEvent.title+"</h2>";
					if (calEvent.eventSource) {
						message = message + "<p>From: " + calEvent.eventSource + "</p>";
					}
					message = message + "<p>Start: " + start + "</p>";
					if (calEvent.end) {
						var end = $.fullCalendar.formatDate(calEvent.end, dateformat);
						message = message + "<p>End: " + end + "</p>";
					}
					message = message + "<hr /><p>" + calEvent.text + "</p>";
					foswiki.HijaxPlugin.showOops(message);
					break;
				default:
					if (calEvent.editable) {
						getEvent(calEvent, function(event){
							foswiki.FullCalendar.loadForm(event);
						});
					} else {
						foswiki.FullCalendar.loadForm(calEvent);
					}
            }
			if (calEvent.url) {
				window.open(calEvent.url);
				return false;
			}
        }
    });
}
};
}(jQuery);

} // if foswiki.FullCalendar == undefined