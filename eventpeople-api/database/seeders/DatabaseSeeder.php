<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Event;
use Spatie\Permission\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DatabaseSeeder extends Seeder
{

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        Role::create(['name' => 'Coordinator', 'guard_name' => 'web']);
        Role::create(['name' => 'Security', 'guard_name' => 'web']);
        Role::create(['name' => 'Volunteer', 'guard_name' => 'web']);

        $admin = User::factory()->create([
            'name' => 'Main Boss',
            'email' => 'admin@test.com',
        ]);

        $admin->assignRole('Coordinator');

        $securityUsers = User::factory(5)->create()->each(fn($u) => $u->assignRole('Security'));
        $volunteers = User::factory(10)->create()->each(fn($u) => $u->assignRole('Volunteer'));

        $event = Event::create([
            'name' => 'Test Event',
            'description' => 'Test Description',
            'start_date' => Carbon::now()->addDays(10),
            'end_date' => Carbon::now()->addDays(12),
        ]);

        $mainGate = $event->zones()->create([
            'name' => 'Main Gate',
            'description' => 'Ticket and wristband control'
        ]);

        $stagePit = $event->zones()->create([
            'name' => 'Stage Pit',
            'description' => 'Stage pit security'
        ]);

        $stageShift = $stagePit->shifts()->create([
            'start_time' => Carbon::now()->addDays(10)->setTime(18, 0),
            'end_time' => Carbon::now()->addDays(10)->setTime(22, 0),
            'required_people' => 3,
            'required_role' => 'Security'
        ]);

        $stageShift->users()->attach([
            $securityUsers[0]->id => ['status' => 'approved'],
            $securityUsers[1]->id => ['status' => 'pending'],
        ]);
    }
}
