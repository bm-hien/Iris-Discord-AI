const moderationFunctions = [
  {
    name: "moderate_member",
    description: "Perform moderation actions on members in the Discord server",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["mute", "unmute", "kick", "ban"],
          description: "The moderation action to perform on the member"
        },
        user_id: {
          type: "string",
          description: "ID of the target member (mention like <@123456> or username)"
        },
        duration: {
          type: "string",
          description: "Duration for mute/ban (e.g. 30s, 10m, 1h, 1d). Leave empty if not needed"
        },
        reason: {
          type: "string",
          description: "Reason for performing the moderation action"
        }
      },
      required: ["action", "user_id"]
    }
  },
  {
    name: "clear_messages",
    description: "Delete a number of messages in the current channel",
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "Number of messages to delete (from 1 to 100)"
        },
        reason: {
          type: "string",
          description: "Reason for deleting messages"
        }
      },
      required: ["amount"]
    }
  },
  {
    name: "lock_channel",
    description: "Lock the current channel or a specific channel by ID, preventing members from sending messages",
    parameters: {
      type: "object",
      properties: {
        channel_id: {
          type: "string",
          description: "ID of the channel to lock (optional - if not provided, will lock current channel)"
        }
      },
      required: []
    }
  },
  {
    name: "unlock_channel", 
    description: "Unlock the current channel or a specific channel by ID, allowing members to send messages again",
    parameters: {
      type: "object",
      properties: {
        channel_id: {
          type: "string",
          description: "ID of the channel to unlock (optional - if not provided, will unlock current channel)"
        }
      },
      required: []
    }
  }
];

// Helper function to convert function calls to legacy command format
function convertFunctionCallToCommand(functionCall) {
  const { name, arguments: args } = functionCall;
  
  switch (name) {
    case "moderate_member":
      return {
        function: args.action,
        target: args.user_id,
        reason: args.reason,
        duration: args.duration
      };
    
    case "clear_messages":
      return {
        function: "clear",
        amount: args.amount,
        reason: args.reason
      };
      
    case "lock_channel":
      return {
        function: "lock",
        channel_id: args.channel_id
      };
      
    case "unlock_channel":
      return {
        function: "unlock",
        channel_id: args.channel_id
      };
    
    default:
      return null;
  }
}

module.exports = {
  moderationFunctions,
  convertFunctionCallToCommand
};