function Player(game){


	//========================
	// Input properties
	//========================		

	this.key_binds = {};
		
	//========================
	// Properties related networking
	//========================	
	this.id = "1";

	//These are used in moving us around later
    this.old_state = {};
    this.cur_state = {};
    this.state_time = new Date().getTime()


    //Our local history of inputs
    this.key_inputs = [];
    this.inputs = [];


	//========================
	// Properties related to the world
	//========================
	this.playerspeed = 1;

	this.submap_size = 32;

	//view mao size
	this.view_map_radius = 1

	//current surrounding buffer
	this.view_map = { "xorigin": 0, "yorigin": 0, "xoffset" : 0, "xoffset" : 0,  "submaps" : []};

	this.submap_buffer = [];

	//relative to teh visible view port
	this.view_relative_pos = {
		x : 0,
		y : 0
	};

	//absolute character position in the world
	this.global_pos = {
		x : 0,
		y : 0
	};

	//relative to the current submao
	this.submap_pos = {
		x : 0,
		y : 0
	};

	//submap as supplied by terrain generator
	this.submap = {
		x : 0,
		y : 0
	};

	//covertion functions
	this.submap_to_global = function(submap, pos)
	{
		return {
			x : this.submap.x * this.submap_size + this.submap_pos.x,
			y : this.submap.y * this.submap_size + this.submap_pos.y
		}		
	}

	this.global_to_submap = function(pos)
	{
		return {
			submap : {
				x : Math.floor(pos.x / this.submap_size),
				y : Math.floor(pos.y / this.submap_size),
			},

			submap_pos : {
				x : (pos.x % this.submap_size),
				y : (pos.y % this.submap_size),
			}
		}		
	}


	// sets the current view map of the player
	// stitches the surrounding submaps in one to be used for rendering
	this.set_view_map = function(map)
	{

		var n = this.view_map_radius;
		var n_cache = n + 4;
		for(var i = this.submap.x-n_cache; i <= this.submap.x+n_cache; i++)
			for(var j = this.submap.y-n_cache; j <= this.submap.y+n_cache; j++)
				map.load_submap(i,j);
		
		var view_x = 0;
		var view_y = 0;
		for(var i = this.submap.x-n; i <= this.submap.x+n; i++){
			view_y = 0;
			for(var j = this.submap.y-n; j <= this.submap.y+n; j++){
				
				if(!this.view_map.submaps[view_x]) this.view_map.submaps[view_x] = [];

				this.view_map.submaps[view_x][view_y] = map.submaps[i][j]["map"];
				view_y++;	
			}
			view_x++;
		}

		this.view_map["xoffset"] = this.view_map.submaps[0][0]["content"]["background"][0]["x"];
		this.view_map["yoffset"] = this.view_map.submaps[0][0]["content"]["background"][0]["y"];
		//important not to change!
		this.view_map["xorigin"] = this.submap.x;
		this.view_map["yorigin"] = this.submap.y;


		// debug
		// for (var i = 0; i < this.view_map.submaps.length; i++) {
			
		// 	var line = "";
		// 	for (var j = 0; j < this.view_map.submaps[i].length; j++) {
		// 		line += this.view_map.submaps[i][j].x + "," + this.view_map.submaps[i][j].y + " ";
		// 	}
		// 	console.log(line);
		// }
	},

	this.shift_view_map = function(map, direction)
	{

		//set up rows/columns to be moved
		var north_south_dir = false;
		var buffer_row, mid_to_edge_row, edge_to_mid_row, new_row_offset;
		// directions
		// 0 NORTH
		// 1 EAST
		// 2 SOUTH
		// 4 WEST
		switch(direction)
		{
			
			//NORTH						
			case 0:
				buffer_row = 2;
				mid_to_edge_row = 1;
				edge_to_mid_row = 0;
				new_row_offset = -1;
			break;

			//EAST
			case 1:
				north_south_dir = true;
				buffer_row = 0;
				mid_to_edge_row = 1;
				edge_to_mid_row = 2;
				new_row_offset = 1;
				
			break;

			//SOUTH
			case 2:
				buffer_row = 0;
				mid_to_edge_row = 1;
				edge_to_mid_row = 2;
				new_row_offset = 1;
			break;

			//WEST
			case 3:
				north_south_dir = true;
				buffer_row = 2;
				mid_to_edge_row = 1;
				edge_to_mid_row = 0;
				new_row_offset = -1;
			break;

			default: return;
		}

		var submap;
		//save row to buffer
		if(north_south_dir)
		{
			for (var i = 0; i < this.view_map.submaps.length; i++) {

				submap = this.view_map.submaps[i][buffer_row];

				this.save_submap(submap);
			}
		} else {
			for (var i = 0; i < this.view_map.submaps[mid_to_edge_row].length; i++) {

				submap = this.view_map.submaps[buffer_row][i];

				this.save_submap(submap);	
			}
		}

		//shift mid row to edge
		if(north_south_dir)
		{
			for (var i = 0; i < this.view_map.submaps.length; i++)
			{
				this.view_map.submaps[i][buffer_row] = this.view_map.submaps[i][mid_to_edge_row];	
			}
		} else {
			for (var i = 0; i < this.view_map.submaps[mid_to_edge_row].length; i++)
			{
				this.view_map.submaps[buffer_row][i] = this.view_map.submaps[mid_to_edge_row][i];	
			}
		}

		//shift edge row to mid
		if(north_south_dir)
		{
			for (var i = 0; i < this.view_map.submaps.length; i++){
				this.view_map.submaps[i][mid_to_edge_row] = this.view_map.submaps[i][edge_to_mid_row];
			}
		} else {
			for (var i = 0; i < this.view_map.submaps[mid_to_edge_row].length; i++)
			{
				this.view_map.submaps[mid_to_edge_row][i] = this.view_map.submaps[edge_to_mid_row][i];
			}
			
		}
	

		//get new row
		if(north_south_dir)
		{
			for (var i = 0; i < this.view_map.submaps.length; i++) {
				var submap_newx = this.view_map.submaps[i][mid_to_edge_row]["x"];
				var submap_newy = this.view_map.submaps[i][mid_to_edge_row]["y"]+new_row_offset;

				
				if(this.submap_buffer[submap_newx] && this.submap_buffer[submap_newx][submap_newy]){
					// console.log("cached", submap_newx, submap_newy);
					submap = this.submap_buffer[submap_newx][submap_newy];
					this.view_map.submaps[i][edge_to_mid_row] = submap;
				}
				else
				{
					var start = new Date().getTime();

					map.load_submap(submap_newx,submap_newy);

					var time = new Date().getTime() - start;
					// debug
					// console.log("map loaded" , time , "ms");

					//no submap in the buffer
					if(!map.submaps[submap_newx] || !map.submaps[submap_newx][submap_newy])
					{
						this.view_map.submaps[i][edge_to_mid_row] = undefined;	
						continue;	
					}
					 

					submap = map.submaps[submap_newx][submap_newy].map;
					this.view_map.submaps[i][edge_to_mid_row] = submap;

				}
				game.render_submap(this.view_map, submap, edge_to_mid_row, i);

			}

		} else {
			for (var i = 0; i < this.view_map.submaps[mid_to_edge_row].length; i++) {
				var submap_newx = this.view_map.submaps[mid_to_edge_row][i]["x"]+new_row_offset;
				var submap_newy = this.view_map.submaps[mid_to_edge_row][i]["y"];

				
				if(this.submap_buffer[submap_newx] && this.submap_buffer[submap_newx][submap_newy]){
					// console.log("using cached", submap_newx, submap_newy);
					submap = this.submap_buffer[submap_newx][submap_newy];
					this.view_map.submaps[edge_to_mid_row][i] = submap;

				}
				else
				{
					var start = new Date().getTime();

					map.load_submap(submap_newx,submap_newy);

					var time = new Date().getTime() - start;
					// console.log("map loaded" , time , "ms");

					//no submap in the buffer
					if(!map.submaps[submap_newx] || !map.submaps[submap_newx][submap_newy])
					{
						this.view_map.submaps[edge_to_mid_row][i] = undefined;
						continue;	
					}
					
					
					submap = map.submaps[submap_newx][submap_newy].map;
					this.view_map.submaps[edge_to_mid_row][i] = submap;

				}
				
				game.render_submap(this.view_map, submap, i, edge_to_mid_row);
				
			}
		}


		//DEBUG
		/*
		for (var i = 0; i < this.view_map.submaps.length; i++) {
			
			var line = "";
			for (var j = 0; j < this.view_map.submaps[i].length; j++) {
				line += this.view_map.submaps[i][j].x + "," + this.view_map.submaps[i][j].y + " ";
			}
			console.log(line);
		}
		*/

	}


	this.save_submap = function(submap)
	{

		if(!submap) return;
		//save
		if(!this.submap_buffer[submap.x]) this.submap_buffer[submap.x] = [];
		this.submap_buffer[submap.x][submap.y] = submap;

		// console.log("***submap saved to buffer", submap.x, submap.y);

		submap = submap.content;

		//hide background tiles
		for (var k = 0; k < submap["background"].length; k++) {
			var tile_object = submap["background"][k];
			var tile = tile_object.type;
			var tile_ent = tile_object.ent;

			game.bin_entity(tile_ent, tile);

		}

		//render detail terrain
		for (var k = 0; k < submap["detail"].length; k++) {
			var tile_object = submap["detail"][k];
			var tile = tile_object.type;
			var tile_ent = tile_object.ent;

			game.bin_entity(tile_ent, tile);

		}
	}

	this.next_map_empty = function(direction)
	{
		// directions
		// 0 NORTH
		// 1 EAST
		// 2 SOUTH
		// 4 WEST
		switch(direction)
		{
			
			//NORTH						
			case 0:
				return (!this.view_map.submaps[1][0]);
			break;

			//EAST
			case 1:
				return (!this.view_map.submaps[2][1]);
			break;

			//SOUTH
			case 2:
				return (!this.view_map.submaps[1][2]);
			break;

			//WEST
			case 3:
				return (!this.view_map.submaps[0][1]);
			break;

			default: return;
		}

	}
}


function Keybinds()
{
	
}