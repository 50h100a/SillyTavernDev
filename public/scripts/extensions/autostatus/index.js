import { generateQuietPrompt, is_send_press, getCurrentChatId, eventSource, event_types, saveSettingsDebounced, substituteParams } from "../../../script.js";
import { getContext, extension_settings } from "../../extensions.js";
import { registerSlashCommand } from "../../slash-commands.js";
import { stringFormat, waitUntilCondition } from "../../utils.js";
export { MODULE_NAME };

const MODULE_NAME = 'autostatus';
const METADATA_KEY = 'autostatus';
const PREFIX = 'AUTOSTATUS: ';

const DEFAULT_SETTINGS = {
	attributes: {
		'location': {
			promptFormat: "[PAUSE THE ROLEPLAY][Write {{char}}'s current location.]",
			msgFormat: "{{char}} location: {{value}}",
			userFormat: "Location: {{value}}",
			enabled: true,
			injectAt: 0,
		},
		'clothing': {
			promptFormat: "[PAUSE THE ROLEPLAY][Write a comma-delimited list of {{char}}'s current clothing.]",
			msgFormat: "{{char}} is wearing: {{value}}",
			userFormat: "Clothing: {{value}}",
			enabled: true,
			injectAt: 0,
		},
		'thoughts': {
			promptFormat: "[PAUSE THE ROLEPLAY][Write {{char}}'s current thought.]",
			msgFormat: "{{char}} is thinking: {{value}}",
			userFormat: "Thinking: {{value}}",
			enabled: true,
			injectAt: 0,
		},
	},
	queryInterval: 1,
	auto_update: true,
	inject: true,


};

function getAutoStatusSettings() {
	if (extension_settings.autostatus === undefined || Object.keys(extension_settings.autostatus).length === 0) {
		extension_settings.autostatus = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
	return extension_settings.autostatus;
}

async function loadSettings() {
	const settings = getAutoStatusSettings();
	console.log(PREFIX+"Settings: %o", settings);

	$('#autostatus_allow_updates').prop('checked', settings.auto_update).trigger('input');
	$('#autostatus_allow_injection').prop('checked', settings.inject).trigger('input');

	$("#autostatus_attribute_list").val(JSON.stringify(settings.attributes, null, 2));


	let attrVals = {};
	for (const attr in settings.attributes) {
		attrVals[attr] = "";
	}
	updateAttributeDisplay(attrVals);

	// for (const attrib of settings.attributes) {
	// 	const template = $("#attribute_template").clone();
    //     const isFav = character.fav || character.fav == 'true';
    //     template.data("id", character.avatar);
    //     template.find(".avatar img").attr("src", avatar);
    //     template.find(".avatar img").attr("title", character.avatar);
    //     template.find(".ch_name").text(character.name);
    //     template.attr("chid", characters.indexOf(character));
    //     template.find('.ch_fav').val(isFav);
    //     template.toggleClass('is_fav', isFav);

    //     // Display inline tags
    //     const tags = getTagsList(character.avatar);
    //     const tagsElement = template.find('.tags');
    //     tags.forEach(tag => appendTagToList(tagsElement, tag, {}));

    //     if (!group) {
    //         template.find('[data-action="speak"]').hide();
    //     }

    //     if (
    //         group &&
    //         Array.isArray(group.members) &&
    //         group.members.includes(character.avatar)
    //     ) {
    //         template.css({ 'order': group.members.indexOf(character.avatar) });
    //         template.toggleClass('disabled', group.disabled_members.includes(character.avatar));
    //         $("#rm_group_members").append(template);
    //     } else {
    //         $("#rm_group_add_members").append(template);
    //     }
	// }
	

    // console.debug(`loading chromadb strat:${extension_settings.chromadb.strategy}`);
    // $("#chromadb_strategy option[value=" + extension_settings.chromadb.strategy + "]").attr(
    //     "selected",
    //     "true"
    // );
    // $("#chromadb_sort_strategy option[value=" + extension_settings.chromadb.sort_strategy + "]").attr(
    //     "selected",
    //     "true"
    // );
    // $('#chromadb_keep_context').val(extension_settings.chromadb.keep_context).trigger('input');
    // $('#chromadb_n_results').val(extension_settings.chromadb.n_results).trigger('input');
    // $('#chromadb_split_length').val(extension_settings.chromadb.split_length).trigger('input');

    // enableDisableSliders();
    // onStrategyChange();
}

async function updateAttributeDisplay(attribs) {
	$('#attribute_value_list').empty();
	for (const attr in attribs) {
		const template = $("#attribute_value_template .attribute_value").clone();
		template.find("#name").text(attr);
		template.find("#value").text(attribs[attr]);
		$('#attribute_value_list').append(template);
	}
	if (attribs.length == 0) {
		$('#attribute_value_list').append(`<small><i>No attributes defined</i></small>`);
	}
}

async function queryForAttributes(context) {
    try {
        // Wait for the send button to be released
        waitUntilCondition(() => is_send_press === false, 10000, 100);
    } catch {
        console.debug(PREFIX+'Timeout waiting for is_send_press');
        return;
    }

	const settings = getAutoStatusSettings();
	let attrVals = {};
	for (const attr in settings.attributes) {
		const prompt = substituteParams(settings.attributes[attr].promptFormat);
		const value = await generateQuietPrompt(prompt);
		console.log(PREFIX+`New '${attr}' value: %o`, value);
		attrVals[attr] = value;
	}

    const newContext = getContext();

    // something changed during summarization request
    if (newContext.groupId !== context.groupId
        || newContext.chatId !== context.chatId
        || (!newContext.groupId && (newContext.characterId !== context.characterId))) {
        console.log('Context changed, values discarded');
        return;
    }

	updateAttributeDisplay(attrVals);
    // setMemoryContext(summary, true);
    // return summary;
}


window.autostatus_interceptGeneration = async (chat, maxContext) => {
    // if (extension_settings.chromadb.auto_adjust) {
    //     doAutoAdjust(chat, maxContext);
    // }

    // const currentChatId = getCurrentChatId();
    // if (!currentChatId)
        // return;
}

function getLatestAttribsFromChat(chat) {
    if (!Array.isArray(chat) || !chat.length) {
        return {};
    }

	const lastmsg = chat[chat.length-1];
	if (lastmsg.extra && lastmsg.extra.autostatus) {
		return lastmsg.extra.autostatus;
	}
    return {};
}


function setCurrentAttribs(attribs, saveToMessage) {
    const context = getContext();
    context.setExtensionPrompt(MODULE_NAME, formatMemoryValue(value), extension_prompt_types.AFTER_SCENARIO);


	updateStatusDisplay(attribs);
    $('#memory_contents').val(value);
    console.log('Memory set to: ' + value);

    if (saveToMessage && context.chat.length) {
        const idx = context.chat.length - 2;
        const mes = context.chat[idx < 0 ? 0 : idx];

        if (!mes.extra) {
            mes.extra = {};
        }

        mes.extra.memory = value;
        saveChatDebounced();
    }
}
function saveLastValues() {
    const context = getContext();
    lastGroupId = context.groupId;
    lastCharacterId = context.characterId;
    lastChatId = context.chatId;
    lastMessageId = context.chat?.length ?? null;
    lastMessageHash = getStringHash((context.chat.length && context.chat[context.chat.length - 1]['mes']) ?? '');
}

async function onChatEvent() {
	console.log("Chat event!");
	const settings = getAutoStatusSettings()
    const context = getContext();
    const chat = context.chat;

    // // no characters or group selected
    // if (!context.groupId && context.characterId === undefined) {
    //     return;
    // }
    // // Generation is in progress
    // if (is_send_press) {
    //     return;
    // }
    // // Chat/character/group changed
    // if ((context.groupId && lastGroupId !== context.groupId) || (context.characterId !== lastCharacterId) || (context.chatId !== lastChatId)) {
    //     const latestAttribs = getLatestAttribsFromChat(chat);
    //     setCurrentAttribs(latestAttribs, false);
    //     saveLastValues();
    //     return;
    // }

    // // Currently summarizing or frozen state - skip
    // if (inApiCall || extension_settings.memory.memoryFrozen) {
    //     return;
    // }

    // // No new messages - do nothing
    // if (chat.length === 0 || (lastMessageId === chat.length && getStringHash(chat[chat.length - 1].mes) === lastMessageHash)) {
    //     return;
    // }

    // // Messages has been deleted - rewrite the context with the latest available memory
    // if (chat.length < lastMessageId) {
    //     const latestAttribs = getLatestAttribsFromChat(chat);
    //     setCurrentAttribs(latestAttribs, false);
    // }

    // // Message has been edited / regenerated - delete the saved memory
    // if (chat.length
    //     && chat[chat.length - 1].extra
    //     && chat[chat.length - 1].extra.memory
    //     && lastMessageId === chat.length
    //     && getStringHash(chat[chat.length - 1].mes) !== lastMessageHash) {
    //     delete chat[chat.length - 1].extra.memory;
    // }

    // try {
    //     await summarizeChat(context);
    // }
    // catch (error) {
    //     console.log(error);
    // }
    // finally {
    //     saveLastValues();
    // }
}

async function getHtml(relpath) {
	const url = new URL(relpath, window.location.href);
    const settingsFetch = await fetch(url, {method: 'GET'});
	if (!settingsFetch.ok) {
		console.error(PREFIX+"Failed to fetch "+url);
		return;
	}
	return settingsFetch.text();
}

jQuery(async () => {
	const settingsHtml = await getHtml('/scripts/extensions/autostatus/settings.html');
    $('#extensions_settings2').append(settingsHtml);
    await loadSettings();

	// const uiHtml = await getHtml('/scripts/extensions/autostatus/interface.html');
    // $('#movingDivs').append(uiHtml);
	
    $('#autostatus_attribute_list').on('change', function (e) {
		try {
			const newjson = JSON.parse(e.currentTarget.value);
			getAutoStatusSettings().attributes = newjson;
			console.debug(PREFIX+"New config: %o", getAutoStatusSettings());
			saveSettingsDebounced();
			$('#config_warnings').text("");
		} catch(err) {
			$('#config_warnings').text("Config JSON is invalid.");
		}
	});
    $('#autostatus_update_now').on('click', function (e) {
		queryForAttributes(getContext());
	});


    $('#autostatus_allow_updates').on('click', function (e) {
		console.debug(PREFIX+"Updating set to %o", e.currentTarget.checked);
		getAutoStatusSettings().auto_update = e.currentTarget.checked;
		saveSettingsDebounced();
	});
    $('#autostatus_allow_injection').on('click', function (e) {
		console.debug(PREFIX+"Injection set to %o", e.currentTarget.checked);
		getAutoStatusSettings().inject = e.currentTarget.checked;
		saveSettingsDebounced();
	});

    $('#autostatus_import').on('click', () => $('#autostatus_import_file').trigger('click'));
	$('#autostatus_import_file').on('change', function(e) {
		const file = e.target.files[0];
		console.debug(PREFIX+"Import %o", file);
	});
    $('#autostatus_export').on('click', function(e) {
		console.debug(PREFIX+"Export");
	});


    eventSource.on(event_types.MESSAGE_RECEIVED, onChatEvent);
    eventSource.on(event_types.MESSAGE_DELETED, onChatEvent);
    eventSource.on(event_types.MESSAGE_EDITED, onChatEvent);
    eventSource.on(event_types.MESSAGE_SWIPED, onChatEvent);
    eventSource.on(event_types.CHAT_CHANGED, onChatEvent);

});
