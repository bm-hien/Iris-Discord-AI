const { executeAddRole, executeRemoveRole } = require('../commands/commandExecutors/Moderation/roleCommand');

const roleManagementFunctions = [
  {
    name: "add_role",
    description: "Add a role to a guild member. Requires Manage Roles permission and proper role hierarchy.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The Discord user ID of the target member"
        },
        roleId: {
          type: "string", 
          description: "The Discord role ID to add"
        }
      },
      required: ["userId", "roleId"]
    }
  },
  {
    name: "remove_role",
    description: "Remove a role from a guild member. Requires Manage Roles permission and proper role hierarchy.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The Discord user ID of the target member"
        },
        roleId: {
          type: "string",
          description: "The Discord role ID to remove"
        }
      },
      required: ["userId", "roleId"]
    }
  }
  // Removed list_roles function
];

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
          description: "Duration for temporary actions (e.g., '10m', '1h', '2d') - only for mute"
        },
        reason: {
          type: "string",
          description: "Reason for the moderation action"
        }
      },
      required: ["action", "user_id"]
    }
  },
  {
    name: "clear_messages",
    description: "Clear/delete messages from the current channel",
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "integer",
          description: "Number of messages to delete (1-100)",
          minimum: 1,
          maximum: 100
        },
        reason: {
          type: "string",
          description: "Reason for clearing messages"
        }
      },
      required: ["amount"]
    }
  },
  {
    name: "change_nickname",
    description: "Change nickname of a user (including self) in the server",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The ID of the user to change nickname (can be self)"
        },
        nickname: {
          type: "string",
          description: "New nickname to set (null or empty to reset to username)"
        }
      },
      required: ["userId"]
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
  },
  // Add role management functions to moderation functions
  ...roleManagementFunctions
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
    
    case 'add_role':
      return {
        function: 'add_role',
        parameters: {
          userId: args.userId,
          roleId: args.roleId
        }
      };

    case 'remove_role':
      return {
        function: 'remove_role',
        parameters: {
          userId: args.userId,
          roleId: args.roleId
        }
      };
    case 'change_nickname':
      return {
        function: 'change_nickname',
        parameters: {
          userId: args.userId,
          nickname: args.nickname || null
        }
      };

    // Removed list_roles case

    default:
      return null;
  }
}

module.exports = {
  moderationFunctions,
  convertFunctionCallToCommand
};