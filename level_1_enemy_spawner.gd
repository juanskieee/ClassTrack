extends Node2D

# Configuration - adjust in Inspector
@export var initial_spawn_distance := 500.0
@export var spawn_margin := 1000.0  # Spawn ahead of camera
@export var min_y := 1
@export var max_y := 1
@export var wave_cooldown := 1.0  # Time between waves
@export var enemies_per_wave := [4, 5]
@export var boss_wave := 1
@export var enemy_spacing := 150.0  # Horizontal spacing between pre-spawned enemies
@export var next_waves_to_preload := 2  # How many future waves to preload
@export var max_ranged_enemies := 3  # Maximum number of ranged enemies per wave

# Enemy scenes - assign in Inspector
@export var melee_enemy: String = "res://SCENES/LEVEL1_ENEMY_MELEE.tscn"
@export var range_enemy: String = "res://SCENES/LEVEL1_ENEMY_RANGED.tscn"
@export var boss: String = "res://SCENES/LEVEL1_BOSS_BATO.tscn"

# Internal state
var current_wave := 0
var enemies_alive := 0
var player_ref: Node2D
var camera_ref: Camera2D
var ground_ref: Node2D
var wave_active := false
var preloaded_waves := []  # Array of arrays containing preloaded waves
var enemy_scenes := {}  # Cache for loaded scenes

func _ready():
	player_ref = get_tree().get_first_node_in_group("PLAYER")
	camera_ref = player_ref.get_node("Camera2D")
	ground_ref = get_parent().get_node("LEVEL1_MAP_GROUND")
	
	# Preload enemy scenes to avoid loading during gameplay
	preload_enemy_scenes()
	
	# Preload several waves ahead
	for i in range(next_waves_to_preload):
		preload_wave(i + 1)
	
	# Start first wave quickly
	await get_tree().create_timer(0.5).timeout
	start_next_wave()

func preload_enemy_scenes():
	# Cache enemy scenes to avoid loading during gameplay
	enemy_scenes["melee"] = load(melee_enemy)
	enemy_scenes["range"] = load(range_enemy)
	enemy_scenes["boss"] = load(boss)
	print("Enemy scenes preloaded")

func _process(delta):
	# Update positions of all preloaded enemies to maintain distance from player
	for wave_index in range(preloaded_waves.size()):
		var wave = preloaded_waves[wave_index]
		for enemy_index in range(wave.size()):
			var enemy = wave[enemy_index]
			if is_instance_valid(enemy):
				# Calculate base distance from camera (further away for later waves)
				var target_x = camera_ref.global_position.x + spawn_margin + (wave_index * 300)
				# Add spacing between enemies
				target_x += enemy_index * enemy_spacing
				# Move towards target position (only X-axis)
				enemy.global_position.x = target_x

func preload_wave(wave_number):
	print("Preloading wave " + str(wave_number))
	
	# Skip preload if beyond boss wave
	if wave_number > boss_wave:
		return
		
	var wave_enemies = []
	var enemies_to_spawn = enemies_per_wave[min(wave_number-1, enemies_per_wave.size()-1)]
	
	# Determine enemy types for this wave
	var enemy_types = []
	var range_count = 0
	
	# First, determine how many ranged enemies we'll have (random but capped)
	var desired_ranged = randi() % (max_ranged_enemies + 1)
	
	# Create a list of enemy types in random order
	for i in range(enemies_to_spawn):
		if range_count < desired_ranged:
			enemy_types.append("range")
			range_count += 1
		else:
			enemy_types.append("melee")
	
	# Shuffle the enemy types to randomize positions
	enemy_types.shuffle()
	
	# Now spawn the enemies in the randomized order
	for i in range(enemies_to_spawn):
		var enemy_type = enemy_types[i]
		var spawn_x = camera_ref.global_position.x + spawn_margin + (i * enemy_spacing)
		var spawn_y = ground_ref.global_position.y - randf_range(min_y, max_y)
		
		var enemy = enemy_scenes[enemy_type].instantiate()
		enemy.global_position = Vector2(spawn_x, spawn_y)
		
		if enemy.has_signal("enemy_died"):
			enemy.enemy_died.connect(_on_enemy_died)
		
		# Make enemy inactive
		enemy.visible = false
		if enemy.has_method("set_process"):
			enemy.set_process(false)
		if enemy.has_method("set_physics_process"):
			enemy.set_physics_process(false)
		
		add_child(enemy)
		wave_enemies.append(enemy)
	
	preloaded_waves.append(wave_enemies)
	print("Wave " + str(wave_number) + " preloaded with " + str(enemies_to_spawn - range_count) + " melee and " + str(range_count) + " ranged enemies in randomized order")

func start_next_wave():
	current_wave += 1
	print("Starting Wave " + str(current_wave))
	
	# Handle boss wave
	if current_wave > boss_wave:
		spawn_boss()
		return
	
	wave_active = true
	enemies_alive = 0  # Reset counter
	
	# Check if we have this wave preloaded
	if preloaded_waves.size() > 0:
		var current_wave_enemies = preloaded_waves[0]
		
		# Activate all enemies in this wave at once
		for enemy in current_wave_enemies:
			if is_instance_valid(enemy):
				# Activate the enemy immediately
				enemy.visible = true
				if enemy.has_method("set_process"):
					enemy.set_process(true)
				if enemy.has_method("set_physics_process"):
					enemy.set_physics_process(true)
				
				# If enemy has custom activation method, call it
				if enemy.has_method("activate"):
					enemy.activate()
				
				enemies_alive += 1
		
		# No delays, just start the wave immediately
		print("Wave " + str(current_wave) + " activated with " + str(enemies_alive) + " enemies")
		
		# Remove this wave from preloaded waves
		preloaded_waves.remove_at(0)
		
		# Preload next wave if needed
		if current_wave + preloaded_waves.size() <= boss_wave:
			preload_wave(current_wave + preloaded_waves.size())
	else:
		# Fallback if no preloaded wave (should not happen)
		print("WARNING: No preloaded wave available!")
		spawn_immediate_wave()

func spawn_immediate_wave():
	# Emergency function if preloaded waves aren't available
	var enemies_to_spawn = enemies_per_wave[min(current_wave-1, enemies_per_wave.size()-1)]
	
	# Determine enemy types for this wave with randomization
	var enemy_types = []
	var range_count = 0
	
	# First, determine how many ranged enemies we'll have (random but capped)
	var desired_ranged = randi() % (max_ranged_enemies + 1)
	
	# Create a list of enemy types in random order
	for i in range(enemies_to_spawn):
		if range_count < desired_ranged:
			enemy_types.append("range")
			range_count += 1
		else:
			enemy_types.append("melee")
	
	# Shuffle the enemy types to randomize positions
	enemy_types.shuffle()
	
	# Now spawn the enemies in the randomized order
	for i in range(enemies_to_spawn):
		var enemy_type = enemy_types[i]
		var spawn_x = camera_ref.global_position.x + spawn_margin + (i * enemy_spacing)
		var spawn_y = ground_ref.global_position.y - randf_range(min_y, max_y)
		
		var enemy = enemy_scenes[enemy_type].instantiate()
		enemy.global_position = Vector2(spawn_x, spawn_y)
		
		if enemy.has_signal("enemy_died"):
			enemy.enemy_died.connect(_on_enemy_died)
		
		add_child(enemy)
		enemies_alive += 1
	
	print("Immediate wave spawned with " + str(enemies_to_spawn - range_count) + " melee and " + str(range_count) + " ranged enemies in randomized order")

func spawn_boss():
	print("Spawning boss!")
	var spawn_x = camera_ref.global_position.x + spawn_margin
	var spawn_y = ground_ref.global_position.y - 150
	
	var boss_instance = enemy_scenes["boss"].instantiate()
	boss_instance.global_position = Vector2(spawn_x, spawn_y)
	
	if boss_instance.has_signal("enemy_died"):
		boss_instance.enemy_died.connect(_on_boss_defeated)
	
	add_child(boss_instance)
	print("Boss added to scene")

func _on_enemy_died():
	enemies_alive -= 1
	print("Enemy died! Remaining: " + str(enemies_alive))
	
	if enemies_alive <= 0 and wave_active:
		print("Wave completed!")
		wave_active = false
		await get_tree().create_timer(wave_cooldown).timeout
		start_next_wave()

func _on_boss_defeated():
	# Handle boss defeat logic
	print("BOSS DEFEATED! LEVEL COMPLETE!")
	get_tree().paused = true
