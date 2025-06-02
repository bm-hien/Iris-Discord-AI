
const channelManagementFunctions = [
  {
    name: "create_channel",
    description: "Create a new text or voice channel. Requires Manage Channels permission.",
    parameters: {
      type: "object",
      properties: {
        channelName: {
          type: "string",
          description: "Name of the new channel"
        },
        channelType: {
          type: "string",
          description: "Type of channel ('text' or 'voice')",
          enum: ["text", "voice"]
        },
        category: {
          type: "string",
          description: "Category name or ID to place the channel in"
        },
        topic: {
          type: "string",
          description: "Channel topic (text channels only)"
        },
        slowmode: {
          type: "string",
          description: "Slowmode in seconds (0-21600, text channels only)"
        },
        nsfw: {
          type: "boolean",
          description: "Whether the channel is NSFW (text channels only)"
        }
      },
      required: ["channelName"]
    }
  },
  {
    name: "delete_channel",
    description: "Delete a channel. Requires Manage Channels permission.",
    parameters: {
      type: "object",
      properties: {
        channelId: {
          type: "string",
          description: "The Discord channel ID to delete"
        }
      },
      required: ["channelId"]
    }
  },
  {
    name: "edit_channel",
    description: "Edit channel properties. Requires Manage Channels permission.",
    parameters: {
      type: "object",
      properties: {
        channelId: {
          type: "string",
          description: "The Discord channel ID to edit"
        },
        name: {
          type: "string",
          description: "New channel name"
        },
        topic: {
          type: "string",
          description: "New channel topic (text channels only)"
        },
        slowmode: {
          type: "string",
          description: "New slowmode in seconds (0-21600, text channels only)"
        },
        nsfw: {
          type: "boolean",
          description: "Whether the channel is NSFW (text channels only)"
        },
        position: {
          type: "number",
          description: "New position in channel list"
        }
      },
      required: ["channelId"]
    }
  },
  {
    name: "clone_channel",
    description: "Clone a channel with its permissions. Requires Manage Channels permission.",
    parameters: {
      type: "object",
      properties: {
        channelId: {
          type: "string",
          description: "The Discord channel ID to clone"
        },
        newName: {
          type: "string",
          description: "Name for the cloned channel (optional)"
        }
      },
      required: ["channelId"]
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
  },
  {
    name: "create_role",
    description: "Create a new role in the guild. Requires Manage Roles permission.",
    parameters: {
      type: "object",
      properties: {
        roleName: {
          type: "string",
          description: "Name of the new role"
        },
        color: {
          type: "string",
          description: "Role color (hex code like #ff0000 or color name)"
        },
        permissions: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Array of permission names (e.g., ['SendMessages', 'ReadMessageHistory'])"
        },
        mentionable: {
          type: "boolean",
          description: "Whether the role can be mentioned by everyone"
        },
        hoist: {
          type: "boolean",
          description: "Whether the role should be displayed separately in the member list"
        }
      },
      required: ["roleName"]
    }
  },
  {
    name: "delete_role",
    description: "Delete a role from the guild. Requires Manage Roles permission and proper role hierarchy.",
    parameters: {
      type: "object",
      properties: {
        roleId: {
          type: "string",
          description: "The Discord role ID to delete"
        }
      },
      required: ["roleId"]
    }
  },
  {
    name: "edit_role",
    description: "Edit a role's properties. Requires Manage Roles permission and proper role hierarchy.",
    parameters: {
      type: "object",
      properties: {
        roleId: {
          type: "string",
          description: "The Discord role ID to edit"
        },
        name: {
          type: "string",
          description: "New name for the role"
        },
        color: {
          type: "string",
          description: "New color for the role (hex code like #ff0000)"
        },
        permissions: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Array of permission names"
        },
        mentionable: {
          type: "boolean",
          description: "Whether the role can be mentioned by everyone"
        },
        hoist: {
          type: "boolean",
          description: "Whether the role should be displayed separately in the member list"
        }
      },
      required: ["roleId"]
    }
  },
  {
    name: "move_role",
    description: "Move a role's position in the hierarchy. Requires Manage Roles permission.",
    parameters: {
      type: "object",
      properties: {
        roleId: {
          type: "string",
          description: "The Discord role ID to move"
        },
        position: {
          type: "number",
          description: "Specific position to move the role to"
        },
        direction: {
          type: "string",
          description: "Direction to move the role ('up' or 'down')"
        }
      },
      required: ["roleId"]
    }
  }
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
    case 'create_role':
      return {
        function: 'create_role',
        parameters: {
          roleName: args.roleName,
          color: args.color,
          permissions: args.permissions,
          mentionable: args.mentionable,
          hoist: args.hoist
        }
      };
    case 'delete_role':
      return {
        function: 'delete_role',
        parameters: {
          roleId: args.roleId
        }
      };
    case 'edit_role':
      return {
        function: 'edit_role',
        parameters: {
          roleId: args.roleId,
          name: args.name,
          color: args.color,
          permissions: args.permissions,
          mentionable: args.mentionable,
          hoist: args.hoist
        }
      };
    case 'move_role':
      return {
        function: 'move_role',
        parameters: {
          roleId: args.roleId,
          position: args.position,
          direction: args.direction
        }
      };
    case 'create_channel':
      return {
        function: 'create_channel',
        parameters: {
          channelName: args.channelName,
          channelType: args.channelType,
          category: args.category,
          topic: args.topic,
          slowmode: args.slowmode,
          nsfw: args.nsfw
        }
      };
    case 'delete_channel':
      return {
        function: 'delete_channel',
        parameters: {
          channelId: args.channelId
        }
      };
    case 'edit_channel':
      return {
        function: 'edit_channel',
        parameters: {
          channelId: args.channelId,
          name: args.name,
          topic: args.topic,
          slowmode: args.slowmode,
          nsfw: args.nsfw,
          position: args.position
        }
      };
    case 'clone_channel':
      return {
        function: 'clone_channel',
        parameters: {
          channelId: args.channelId,
          newName: args.newName
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